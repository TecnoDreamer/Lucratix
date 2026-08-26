"""RN-013 — regra de sessao unica por conta, na camada de servico (sem HTTP)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.core.sessions import (
    SessionInvalidError,
    SessionRevokedError,
    create_session,
    get_active_session,
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
