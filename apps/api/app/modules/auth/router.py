"""Rotas de autenticacao.

RN-013 (sessao unica por conta, ver app/core/sessions.py): login cria uma
sessao nova e revoga qualquer sessao ativa anterior do mesmo usuario;
logout e /refresh validam/revogam essa sessao no servidor — os tokens JWT
continuam stateless quanto a assinatura/expiracao, mas cada um carrega a
claim `sid` (ver core/security.py) que e checada contra a tabela `sessions`
em toda request autenticada (core/deps.py::get_current_user).
"""

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import (
    email_verification_rate_limiter,
    login_rate_limiter,
    password_reset_rate_limiter,
)
from app.core.security import (
    SESSION_REVOKED_DETAIL,
    InvalidTokenError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.sessions import (
    SessionInvalidError,
    SessionRevokedError,
    create_session,
    get_active_session,
    revoke_session,
)
from app.models.user import User
from app.modules.auth.service import (
    authenticate_user,
    change_password,
    confirm_email_verification,
    confirm_password_reset,
    register_user,
    request_password_reset,
    resend_verification_email,
)
from app.schemas.user import (
    EmailVerificationConfirm,
    PasswordChange,
    PasswordResetConfirm,
    PasswordResetRequest,
    ResendVerificationRequest,
    UserLocaleUpdate,
    UserLogin,
    UserRead,
    UserRegister,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
settings = get_settings()

_ACCESS_COOKIE = "access_token"
_REFRESH_COOKIE = "refresh_token"


def _set_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _set_auth_cookies(response: Response, db: Session, user: User) -> None:
    # RN-013: revoga qualquer sessao ativa anterior do usuario e cria uma
    # nova; o `sid` da sessao criada aqui e o que fica embutido em ambos os
    # tokens (ver core/sessions.py::create_session).
    session = create_session(db, user.id)
    access_token = create_access_token(user.id, session.id)
    refresh_token = create_refresh_token(user.id, session.id)
    _set_cookie(
        response, _ACCESS_COOKIE, access_token, settings.access_token_expire_minutes * 60
    )
    _set_cookie(
        response,
        _REFRESH_COOKIE,
        refresh_token,
        settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)) -> dict[str, str]:
    created, raw_token = register_user(db, data)
    if created:
        db.commit()
    # Resposta identica independente de o e-mail ja existir (RN-012, RF-001).
    response: dict[str, str] = {
        "message": (
            "Cadastro recebido. Se o e-mail informado ainda nao estiver em uso, "
            "sua conta foi criada e voce ja pode fazer login. Enviamos um e-mail "
            "de confirmação — verificar não é obrigatório para usar a plataforma."
        )
    }
    # dev_token so vem preenchido quando uma conta foi criada agora E o
    # envio de e-mail de verdade falhou/nao esta configurado (mesmo padrao
    # de password-reset/request, ver auth/service.py::register_user).
    if not settings.is_production and raw_token is not None:
        response["dev_token"] = raw_token
    return response


@router.post("/login")
def login(
    data: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)
) -> UserRead:
    # RNF-005: limita tentativas por IP + e-mail alvo, para nao permitir
    # que um IP unico faca forca bruta distribuida entre varias contas
    # nem que um unico e-mail seja atacado a partir de varios IPs sem limite.
    client_host = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_host}:{data.email}"
    if not login_rate_limiter.check(rate_limit_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Tente novamente em instantes.",
        )

    user = authenticate_user(db, data.email, data.password)
    if user is None:
        # Mensagem generica: nao diferencia "email inexistente" de "senha incorreta" (RF-002).
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas"
        )
    _set_auth_cookies(response, db, user)
    record_audit(db, action="user.login", entity="user", entity_id=user.id, user_id=user.id)
    db.commit()
    return UserRead.model_validate(user)


@router.post("/refresh")
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> UserRead:
    """RF-003 (issue #33): renova o `access_token` a partir do `refresh_token`.

    Sem isso, a sessao do usuario expirava apos `access_token_expire_minutes`
    (15 min) mesmo com um `refresh_token` valido (7 dias) ainda no cookie —
    o cookie era emitido no login mas nunca lido em nenhuma rota. Nao rotaciona
    o refresh token (mantem o mesmo ate expirar), mas o `sid` que ele carrega
    e validado contra a tabela `sessions` a cada chamada (RN-013): um
    refresh_token assinado e nao-expirado nao basta se a sessao foi revogada
    por um login em outro dispositivo.
    """
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida ou expirada"
        )
    try:
        payload = decode_token(refresh_token, TokenType.REFRESH)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida ou expirada"
        ) from exc

    try:
        get_active_session(db, payload.session_id)
    except SessionRevokedError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_REVOKED_DETAIL
        ) from exc
    except SessionInvalidError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida ou expirada"
        ) from exc

    user = db.get(User, payload.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida ou expirada"
        )

    access_token = create_access_token(user.id, payload.session_id)
    _set_cookie(response, _ACCESS_COOKIE, access_token, settings.access_token_expire_minutes * 60)
    return UserRead.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    access_token: str | None = Cookie(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    # Revoga a sessao no servidor imediatamente (RN-013), em vez de so
    # limpar os cookies no cliente: um access_token eventualmente vazado
    # antes de expirar (15 min) nao deve continuar valendo apos o logout.
    if access_token is not None:
        try:
            payload = decode_token(access_token, TokenType.ACCESS)
            revoke_session(db, payload.session_id)
            db.commit()
        except InvalidTokenError:
            pass
    response.delete_cookie(_ACCESS_COOKIE, path="/")
    response.delete_cookie(_REFRESH_COOKIE, path="/")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/locale")
def update_locale_route(
    data: UserLocaleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    """Idioma da interface (i18n) — preferencia pessoal de UI, sem escopo de
    organizacao nem papel envolvido, mesma categoria de
    workspace_preferences (PR de acessos rapidos): sem `record_audit`,
    qualquer usuario autenticado altera a propria preferencia."""
    current_user.locale = data.locale
    db.commit()
    return UserRead.model_validate(current_user)


_RESET_REQUEST_MESSAGE = (
    "Se o e-mail informado estiver cadastrado, voce recebera instrucoes para "
    "redefinir sua senha."
)


@router.post("/password-reset/request")
def request_password_reset_route(
    data: PasswordResetRequest, request: Request, db: Session = Depends(get_db)
) -> dict[str, str]:
    # RNF-005: mesmo raciocinio do rate limit de login (IP + e-mail alvo) —
    # sem isso, o endpoint vira vetor de abuso/spam (ver core/rate_limit.py).
    client_host = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_host}:{data.email}"
    if not password_reset_rate_limiter.check(rate_limit_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Tente novamente em instantes.",
        )

    raw_token = request_password_reset(db, data.email)
    db.commit()

    response: dict[str, str] = {"message": _RESET_REQUEST_MESSAGE}
    # RF-004: e-mail de verdade existe agora (app/core/email.py) — raw_token
    # so volta aqui quando o envio falhou/RESEND_API_KEY nao esta configurada,
    # e mesmo assim NUNCA em producao (RN-012 relaxada deliberadamente so
    # fora de producao, pra continuar dando pra testar o fluxo ponta a ponta
    # sem um provedor de e-mail configurado).
    if not settings.is_production and raw_token is not None:
        response["dev_token"] = raw_token
    return response


@router.post("/password-reset/confirm")
def confirm_password_reset_route(
    data: PasswordResetConfirm, db: Session = Depends(get_db)
) -> dict[str, str]:
    success = confirm_password_reset(db, data.token, data.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido ou expirado"
        )
    db.commit()
    return {"message": "Senha redefinida com sucesso."}


@router.post("/change-password")
def change_password_route(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    success = change_password(db, current_user, data.current_password, data.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Senha atual incorreta"
        )
    record_audit(
        db,
        action="user.password_changed",
        entity="user",
        entity_id=current_user.id,
        user_id=current_user.id,
    )
    db.commit()
    return {"message": "Senha alterada com sucesso."}


@router.post("/verify-email")
def verify_email_route(
    data: EmailVerificationConfirm, db: Session = Depends(get_db)
) -> dict[str, str]:
    success = confirm_email_verification(db, data.token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido ou expirado"
        )
    db.commit()
    return {"message": "E-mail confirmado com sucesso."}


_RESEND_VERIFICATION_MESSAGE = (
    "Se o e-mail informado estiver cadastrado e ainda não verificado, "
    "enviamos um novo link de confirmação."
)


@router.post("/resend-verification")
def resend_verification_route(
    data: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)
) -> dict[str, str]:
    # RNF-005: mesmo raciocinio do rate limit de password-reset — sem isso,
    # o endpoint vira vetor de spam contra a caixa de entrada de terceiros
    # (ver core/rate_limit.py).
    client_host = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_host}:{data.email}"
    if not email_verification_rate_limiter.check(rate_limit_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Tente novamente em instantes.",
        )

    raw_token = resend_verification_email(db, data.email)
    db.commit()

    response: dict[str, str] = {"message": _RESEND_VERIFICATION_MESSAGE}
    if not settings.is_production and raw_token is not None:
        response["dev_token"] = raw_token
    return response
