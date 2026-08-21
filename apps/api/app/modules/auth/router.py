"""Rotas de autenticacao.

Limitacao conhecida (MVP): a revogacao imediata de refresh token no servidor
(ex.: "derrubar sessao de um usuario agora") ainda nao esta implementada —
os tokens sao JWT stateless e expiram naturalmente (ver ADR-0004). Logout
limpa os cookies no cliente. Revogacao server-side fica para uma issue de
hardening quando houver um store de sessao (ex.: Redis ou tabela dedicada).
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.modules.auth.service import authenticate_user, register_user
from app.schemas.user import UserLogin, UserRead, UserRegister

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


def _set_auth_cookies(response: Response, user: User) -> None:
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
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
    created = register_user(db, data)
    if created:
        db.commit()
    # Resposta identica independente de o e-mail ja existir (RN-012, RF-001).
    return {
        "message": (
            "Cadastro recebido. Se o e-mail informado ainda nao estiver em uso, "
            "sua conta foi criada e voce ja pode fazer login."
        )
    }


@router.post("/login")
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)) -> UserRead:
    user = authenticate_user(db, data.email, data.password)
    if user is None:
        # Mensagem generica: nao diferencia "email inexistente" de "senha incorreta" (RF-002).
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas"
        )
    _set_auth_cookies(response, user)
    record_audit(db, action="user.login", entity="user", entity_id=user.id, user_id=user.id)
    db.commit()
    return UserRead.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, current_user: User = Depends(get_current_user)) -> None:
    response.delete_cookie(_ACCESS_COOKIE, path="/")
    response.delete_cookie(_REFRESH_COOKIE, path="/")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
