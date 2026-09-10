"""Rotas de autenticacao.

RN-016 (sessao unica por conta, ver app/core/sessions.py): login cria uma
sessao nova e revoga qualquer sessao ativa anterior do mesmo usuario;
logout e /refresh validam/revogam essa sessao no servidor — os tokens JWT
continuam stateless quanto a assinatura/expiracao, mas cada um carrega a
claim `sid` (ver core/security.py) que e checada contra a tabela `sessions`
em toda request autenticada (core/deps.py::get_current_user).
"""

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.client_ip import get_client_ip
from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.password_policy import describe_missing_requirements, missing_requirements
from app.core.rate_limit import (
    change_password_account_rate_limiter,
    email_verification_account_rate_limiter,
    email_verification_ip_rate_limiter,
    email_verification_rate_limiter,
    enforce_rate_limits,
    login_account_rate_limiter,
    login_ip_rate_limiter,
    login_rate_limiter,
    password_reset_account_rate_limiter,
    password_reset_confirm_ip_rate_limiter,
    password_reset_ip_rate_limiter,
    password_reset_rate_limiter,
    refresh_ip_rate_limiter,
    register_ip_rate_limiter,
    verify_email_ip_rate_limiter,
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


def _enforce_password_policy(password: str) -> None:
    """Backend é a autoridade da política de senha (validação do frontend é
    só UX) — chamado em toda rota que define uma senha nova: `/register`,
    `/password-reset/confirm`, `/change-password`. `current_password`
    (senha atual, em `/change-password`) NUNCA passa por aqui — só a senha
    NOVA precisa atender a política (legado não é invalidado retroativamente,
    ver docs/security/POLITICA_DE_SENHAS.md)."""
    missing = missing_requirements(password)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=describe_missing_requirements(missing),
        )


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


def _set_auth_cookies(response: Response, db: Session, user: User, request: Request) -> None:
    # RN-016: revoga qualquer sessao ativa anterior do usuario e cria uma
    # nova; o `sid` da sessao criada aqui e o que fica embutido em ambos os
    # tokens (ver core/sessions.py::create_session). IP/user-agent (auditoria
    # de hardening, 2026-09) sao so forense de incidente, nunca usados em
    # nenhuma decisao de autorizacao.
    session = create_session(
        db,
        user.id,
        ip_address=get_client_ip(request),
        user_agent=(request.headers.get("user-agent") or "")[:255] or None,
    )
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
def register(data: UserRegister, request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    # RNF-005: sem conta pra isolar antes de existir — so por IP, contra
    # criacao de conta em massa/automacao (ver core/rate_limit.py).
    enforce_rate_limits(
        [(register_ip_rate_limiter, get_client_ip(request))],
        detail="Muitas tentativas de cadastro. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.register",
    )
    _enforce_password_policy(data.password)
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
    # RNF-005: 3 dimensoes independentes — IP isolado (trava spray: poucas
    # senhas contra muitas contas do mesmo IP), conta isolada (trava
    # stuffing distribuido: uma conta atacada de muitos IPs) e a combinacao
    # IP+conta (mais apertada, cobre o caso comum de usuario legitimo
    # errando a propria senha). Ver core/rate_limit.py — chave unica
    # IP:conta sozinha nao bloqueia nenhum dos dois primeiros casos.
    client_ip = get_client_ip(request)
    enforce_rate_limits(
        [
            (login_ip_rate_limiter, client_ip),
            (login_account_rate_limiter, data.email),
            (login_rate_limiter, f"{client_ip}:{data.email}"),
        ],
        detail="Muitas tentativas de login. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.login",
    )

    user = authenticate_user(db, data.email, data.password)
    if user is None:
        # Mensagem generica: nao diferencia "email inexistente" de "senha
        # incorreta" (RF-002). Sem entity_id/PII no audit — o volume de
        # eventos ja e o sinal util pra detectar abuso, nao "quem" (RN-012).
        record_audit(db, action="user.login_failed", entity="user")
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas"
        )
    _set_auth_cookies(response, db, user, request)
    record_audit(db, action="user.login", entity="user", entity_id=user.id, user_id=user.id)
    db.commit()
    return UserRead.model_validate(user)


@router.post("/refresh")
def refresh(
    request: Request,
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> UserRead:
    """RF-003 (issue #33): renova o `access_token` a partir do `refresh_token`.

    Sem isso, a sessao do usuario expirava apos `access_token_expire_minutes`
    (15 min) mesmo com um `refresh_token` valido (7 dias) ainda no cookie —
    o cookie era emitido no login mas nunca lido em nenhuma rota. Nao rotaciona
    o refresh token (mantem o mesmo ate expirar), mas o `sid` que ele carrega
    e validado contra a tabela `sessions` a cada chamada (RN-016): um
    refresh_token assinado e nao-expirado nao basta se a sessao foi revogada
    por um login em outro dispositivo.
    """
    # RNF-005: risco menor que login (ja exige refresh_token valido + sessao
    # nao revogada), mas sem nenhum limite antes desta rodada — generoso de
    # proposito (clientes legitimos chamam isto automaticamente).
    enforce_rate_limits(
        [(refresh_ip_rate_limiter, get_client_ip(request))],
        detail="Muitas tentativas. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.refresh",
    )
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
    # Revoga a sessao no servidor imediatamente (RN-016), em vez de so
    # limpar os cookies no cliente: um access_token eventualmente vazado
    # antes de expirar (15 min) nao deve continuar valendo apos o logout.
    if access_token is not None:
        try:
            payload = decode_token(access_token, TokenType.ACCESS)
            revoke_session(db, payload.session_id)
            record_audit(
                db, action="user.logout", entity="user", entity_id=payload.user_id, user_id=payload.user_id
            )
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
    # RNF-005: mesmas 3 dimensoes do login (ver core/rate_limit.py) — o
    # endpoint dispara e-mail de verdade, entao sem isso vira vetor de
    # abuso/spam contra a caixa de entrada de terceiros.
    client_ip = get_client_ip(request)
    enforce_rate_limits(
        [
            (password_reset_ip_rate_limiter, client_ip),
            (password_reset_account_rate_limiter, data.email),
            (password_reset_rate_limiter, f"{client_ip}:{data.email}"),
        ],
        detail="Muitas tentativas. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.password_reset_request",
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
    data: PasswordResetConfirm, request: Request, db: Session = Depends(get_db)
) -> dict[str, str]:
    # RNF-005: o token opaco (256 bits) ja torna forca bruta offline
    # inviavel — isto e so defesa em profundidade contra um script testando
    # tokens/chamando o endpoint em volume (ver core/rate_limit.py).
    enforce_rate_limits(
        [(password_reset_confirm_ip_rate_limiter, get_client_ip(request))],
        detail="Muitas tentativas. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.password_reset_confirm",
    )
    _enforce_password_policy(data.new_password)
    user = confirm_password_reset(db, data.token, data.new_password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido ou expirado"
        )
    record_audit(
        db, action="user.password_reset_completed", entity="user", entity_id=user.id, user_id=user.id
    )
    db.commit()
    return {"message": "Senha redefinida com sucesso."}


@router.post("/change-password")
def change_password_route(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    # RNF-005: usuario ja autenticado (sessao unica, RN-016) — o risco aqui
    # e uma sessao comprometida testando a senha atual em loop; por conta,
    # nao por IP (o atacante ja tem uma sessao valida de algum lugar).
    enforce_rate_limits(
        [(change_password_account_rate_limiter, str(current_user.id))],
        detail="Muitas tentativas. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.change_password",
    )
    _enforce_password_policy(data.new_password)
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
    data: EmailVerificationConfirm, request: Request, db: Session = Depends(get_db)
) -> dict[str, str]:
    # RNF-005: mesmo raciocinio de password-reset/confirm — o token ja e a
    # defesa principal, isto e defesa em profundidade.
    enforce_rate_limits(
        [(verify_email_ip_rate_limiter, get_client_ip(request))],
        detail="Muitas tentativas. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.verify_email",
    )
    user = confirm_email_verification(db, data.token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido ou expirado"
        )
    record_audit(db, action="user.email_verified", entity="user", entity_id=user.id, user_id=user.id)
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
    # RNF-005: mesmas 3 dimensoes do login/password-reset (ver
    # core/rate_limit.py) — sem isso, o endpoint vira vetor de spam contra a
    # caixa de entrada de terceiros.
    client_ip = get_client_ip(request)
    enforce_rate_limits(
        [
            (email_verification_ip_rate_limiter, client_ip),
            (email_verification_account_rate_limiter, data.email),
            (email_verification_rate_limiter, f"{client_ip}:{data.email}"),
        ],
        detail="Muitas tentativas. Tente novamente em instantes.",
        db=db,
        action="auth.rate_limited.resend_verification",
    )

    raw_token = resend_verification_email(db, data.email)
    db.commit()

    response: dict[str, str] = {"message": _RESEND_VERIFICATION_MESSAGE}
    if not settings.is_production and raw_token is not None:
        response["dev_token"] = raw_token
    return response
