"""Aplicacao da regra de sessao unica por conta (RN-016).

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


def create_session(
    db: DBSession,
    user_id: uuid.UUID,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> UserSession:
    """`ip_address`/`user_agent` (auditoria de hardening, 2026-09) sao so
    forense de incidente — nunca lidos em nenhuma decisao de autorizacao,
    entao um chamador que nao os informa (default None) nao muda nenhum
    comportamento existente."""
    now = datetime.now(UTC)
    db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    session = UserSession(
        user_id=user_id,
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        ip_address=ip_address,
        user_agent=user_agent,
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


def revoke_active_session_for_user(db: DBSession, user_id: uuid.UUID) -> None:
    """Revoga a sessao ativa do usuario, se houver (no maximo uma, RN-016) —
    usado apos reset de senha bem-sucedido (auditoria de hardening, 2026-09):
    se a conta estava comprometida (sessao ativa de um atacante), o reset por
    e-mail deve encerra-la na hora, forcando um novo login com a senha nova,
    em vez de deixa-la valer ate expirar sozinha (ate 7 dias). Mesmo padrao
    de UPDATE usado dentro de `create_session`, isolado aqui porque um reset
    nao cria sessao nova, so encerra a existente. Sem efeito (UPDATE de 0
    linhas, nunca erro) se nao houver sessao ativa."""
    db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
