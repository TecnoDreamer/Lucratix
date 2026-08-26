"""Aplicacao da regra de sessao unica por conta (RN-013).

Cada login cria uma nova linha em `sessions` e revoga toda sessao ativa
anterior do mesmo usuario. A atomicidade dessa garantia nao depende so da
ordem das instrucoes abaixo: o indice unico parcial
`uq_sessions_one_active_per_user` (migration 0007_sessions) impede, no
proprio banco, que duas linhas com `revoked_at IS NULL` coexistam para o
mesmo usuario mesmo sob concorrencia — dois logins simultaneos jamais
resultam em duas sessoes ativas.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import update
from sqlalchemy.orm import Session as DBSession

from app.core.config import get_settings
from app.models.session import Session as UserSession

settings = get_settings()


class SessionRevokedError(Exception):
    """A sessao referenciada pelo token existe mas foi revogada (login em outro dispositivo)."""


class SessionInvalidError(Exception):
    """A sessao referenciada nao existe ou expirou naturalmente."""


def create_session(db: DBSession, user_id: uuid.UUID) -> UserSession:
    now = datetime.now(UTC)
    db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    session = UserSession(
        user_id=user_id,
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    db.flush()
    return session


def get_active_session(db: DBSession, session_id: uuid.UUID) -> UserSession:
    """Levanta SessionRevokedError/SessionInvalidError se a sessao nao estiver
    ativa. Usado em toda request autenticada (core/deps.py::get_current_user)
    e no /refresh (modules/auth/router.py): um refresh_token sozinho, mesmo
    com assinatura e prazo validos, nao deve sobreviver a revogacao.
    """
    session = db.get(UserSession, session_id)
    if session is None:
        raise SessionInvalidError()
    if session.revoked_at is not None:
        raise SessionRevokedError()
    if session.expires_at < datetime.now(UTC):
        raise SessionInvalidError()
    return session


def revoke_session(db: DBSession, session_id: uuid.UUID) -> None:
    session = db.get(UserSession, session_id)
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)
