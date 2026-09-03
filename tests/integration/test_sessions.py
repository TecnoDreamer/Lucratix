"""RN-013 — regra de sessao unica por conta, na camada de servico (sem HTTP)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.core.sessions import (
    SessionInvalidError,
    SessionRevokedError,
    create_session,
    get_active_session,
    revoke_active_session_for_user,
    revoke_session,
)
from app.models.session import Session as UserSession
from app.models.user import User


def _make_user(db_session) -> User:
    user = User(name="Ana", email=f"{uuid.uuid4()}@example.com", password_hash="hash")
    db_session.add(user)
    db_session.flush()
    return user


def test_create_session_returns_active_session(db_session):
    user = _make_user(db_session)
    session = create_session(db_session, user.id)
    assert session.revoked_at is None
    assert session.expires_at > datetime.now(UTC)


def test_create_session_without_metadata_leaves_it_null(db_session):
    # Chamador que nao informa ip_address/user_agent (default None) nao
    # inventa nenhum valor — mesmo comportamento de sessoes criadas antes
    # dessas colunas existirem (migration 0017_session_metadata).
    user = _make_user(db_session)
    session = create_session(db_session, user.id)
    assert session.ip_address is None
    assert session.user_agent is None


def test_create_session_records_ip_and_user_agent_when_provided(db_session):
    user = _make_user(db_session)
    session = create_session(db_session, user.id, ip_address="203.0.113.10", user_agent="TestAgent/1.0")
    assert session.ip_address == "203.0.113.10"
    assert session.user_agent == "TestAgent/1.0"


def test_create_session_revokes_previous_active_session(db_session):
    user = _make_user(db_session)
    first = create_session(db_session, user.id)
    second = create_session(db_session, user.id)

    db_session.refresh(first)
    assert first.id != second.id
    assert first.revoked_at is not None
    assert second.revoked_at is None


def test_create_session_never_leaves_two_active_sessions(db_session):
    user = _make_user(db_session)
    create_session(db_session, user.id)
    create_session(db_session, user.id)
    create_session(db_session, user.id)

    active = (
        db_session.query(UserSession)
        .filter(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .all()
    )
    assert len(active) == 1


def test_get_active_session_returns_session_when_active(db_session):
    user = _make_user(db_session)
    session = create_session(db_session, user.id)
    assert get_active_session(db_session, session.id).id == session.id


def test_get_active_session_raises_revoked_for_revoked_session(db_session):
    user = _make_user(db_session)
    session = create_session(db_session, user.id)
    revoke_session(db_session, session.id)

    with pytest.raises(SessionRevokedError):
        get_active_session(db_session, session.id)


def test_get_active_session_raises_invalid_for_unknown_session(db_session):
    with pytest.raises(SessionInvalidError):
        get_active_session(db_session, uuid.uuid4())


def test_get_active_session_raises_invalid_for_naturally_expired_session(db_session):
    user = _make_user(db_session)
    session = UserSession(user_id=user.id, expires_at=datetime.now(UTC) - timedelta(days=1))
    db_session.add(session)
    db_session.flush()

    with pytest.raises(SessionInvalidError):
        get_active_session(db_session, session.id)


def test_revoke_session_is_idempotent(db_session):
    user = _make_user(db_session)
    session = create_session(db_session, user.id)
    revoke_session(db_session, session.id)
    first_revoked_at = session.revoked_at

    revoke_session(db_session, session.id)
    assert session.revoked_at == first_revoked_at


def test_revoke_active_session_for_user_revokes_the_active_session(db_session):
    # Auditoria de hardening (2026-09): usado apos reset de senha bem-
    # sucedido — se a conta estava comprometida, a sessao do atacante nao
    # deve sobreviver ao reset.
    user = _make_user(db_session)
    session = create_session(db_session, user.id)

    revoke_active_session_for_user(db_session, user.id)
    # UPDATE em lote (Core) nao sincroniza objeto ja carregado no identity
    # map sozinho — mesma caracteristica de `create_session`
    # (ver test_create_session_revokes_previous_active_session acima, que
    # tambem precisa de `refresh`). Nunca aparece em producao: cada request
    # HTTP usa uma `Session` nova, sem objeto antigo em cache.
    db_session.refresh(session)

    with pytest.raises(SessionRevokedError):
        get_active_session(db_session, session.id)


def test_revoke_active_session_for_user_without_any_active_session_is_a_safe_noop(db_session):
    user = _make_user(db_session)
    # Nenhuma sessao foi criada — nao deve levantar excecao nenhuma.
    revoke_active_session_for_user(db_session, user.id)


def test_revoke_active_session_for_user_never_touches_another_users_session(db_session):
    user_a = _make_user(db_session)
    user_b = _make_user(db_session)
    session_b = create_session(db_session, user_b.id)

    revoke_active_session_for_user(db_session, user_a.id)

    assert get_active_session(db_session, session_b.id).id == session_b.id
