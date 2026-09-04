"""app/core/api_key_auth.py — resolução de API key em OrganizationContext.

Testa `_resolve_api_key_context` diretamente (função pura: organization_id +
raw_key + db), sem precisar montar uma Request do FastAPI — a cobertura
ponta a ponta via HTTP (header Authorization real, endpoint de analytics
real) fica em tests/api/test_api_keys.py.
"""

import uuid

import pytest
from fastapi import HTTPException

from app.core.api_key_auth import _resolve_api_key_context
from app.models.membership import Membership, MembershipRole, MembershipStatus
from app.models.organization import Organization
from app.models.user import User
from app.modules.api_keys.service import create_api_key, revoke_api_key


def _make_org_with_admin(db_session, *, role: MembershipRole = MembershipRole.ORGANIZATION_ADMIN):
    user = User(name="Ana", email=f"{uuid.uuid4()}@example.com", password_hash="hash")
    org = Organization(name="Empresa Teste")
    db_session.add_all([user, org])
    db_session.flush()
    membership = Membership(
        user_id=user.id, organization_id=org.id, role=role, status=MembershipStatus.ACTIVE
    )
    db_session.add(membership)
    db_session.flush()
    return user, org, membership


def test_valid_key_resolves_to_creators_live_role(db_session):
    user, org, _ = _make_org_with_admin(db_session, role=MembershipRole.ANALYST)
    _, raw_key = create_api_key(
        db_session, organization_id=org.id, created_by_user_id=user.id, name="Chave Teste"
    )

    ctx = _resolve_api_key_context(org.id, raw_key, db_session)
    assert ctx.user.id == user.id
    assert ctx.organization_id == org.id
    assert ctx.role == MembershipRole.ANALYST


def test_unknown_key_is_rejected(db_session):
    user, org, _ = _make_org_with_admin(db_session)
    with pytest.raises(HTTPException) as exc_info:
        _resolve_api_key_context(org.id, "lucratix_isto-nunca-existiu", db_session)
    assert exc_info.value.status_code == 401


def test_revoked_key_is_rejected(db_session):
    user, org, _ = _make_org_with_admin(db_session)
    api_key, raw_key = create_api_key(
        db_session, organization_id=org.id, created_by_user_id=user.id, name="Chave Teste"
    )
    revoke_api_key(db_session, api_key)
    db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        _resolve_api_key_context(org.id, raw_key, db_session)
    assert exc_info.value.status_code == 401


def test_key_from_another_organization_never_authenticates_here(db_session):
    # Isolamento multi-tenant (RNF-002): uma chave valida de OUTRA
    # organizacao nunca autentica contra este organization_id.
    user, org_a, _ = _make_org_with_admin(db_session)
    _, org_b, _ = _make_org_with_admin(db_session)
    _, raw_key = create_api_key(
        db_session, organization_id=org_a.id, created_by_user_id=user.id, name="Chave de A"
    )

    with pytest.raises(HTTPException) as exc_info:
        _resolve_api_key_context(org_b.id, raw_key, db_session)
    assert exc_info.value.status_code == 401


def test_key_loses_access_when_creator_membership_is_removed(db_session):
    # Papel resolvido AO VIVO, nunca um snapshot -- se quem criou a chave
    # perde a membership (removido da organizacao), a chave para de
    # autenticar, sem precisar revogar a chave em si.
    user, org, membership = _make_org_with_admin(db_session)
    _, raw_key = create_api_key(
        db_session, organization_id=org.id, created_by_user_id=user.id, name="Chave Teste"
    )

    db_session.delete(membership)
    db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        _resolve_api_key_context(org.id, raw_key, db_session)
    assert exc_info.value.status_code == 401


def test_key_reflects_creators_role_change_without_reissuing_the_key(db_session):
    user, org, membership = _make_org_with_admin(db_session, role=MembershipRole.VIEWER)
    _, raw_key = create_api_key(
        db_session, organization_id=org.id, created_by_user_id=user.id, name="Chave Teste"
    )

    membership.role = MembershipRole.ORGANIZATION_OWNER
    db_session.flush()

    ctx = _resolve_api_key_context(org.id, raw_key, db_session)
    assert ctx.role == MembershipRole.ORGANIZATION_OWNER


def test_successful_authentication_updates_last_used_at(db_session):
    user, org, _ = _make_org_with_admin(db_session)
    api_key, raw_key = create_api_key(
        db_session, organization_id=org.id, created_by_user_id=user.id, name="Chave Teste"
    )
    assert api_key.last_used_at is None

    _resolve_api_key_context(org.id, raw_key, db_session)

    db_session.refresh(api_key)
    assert api_key.last_used_at is not None
