"""Leituras cross-tenant do painel de Super Admin — a UNICA parte do sistema
que legitimamente olha todas as organizacoes de uma vez (protegida por
`require_platform_admin`, nunca por `get_organization_context`). Mesmo
padrao de "no maximo poucas queries, nunca N+1" ja usado em
`organizations/router.py::list_my_organizations_summary`.
"""

import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.membership import Membership, MembershipRole
from app.models.organization import Organization
from app.models.user import User


def list_organizations_with_owner_and_count(
    db: Session,
) -> list[tuple[Organization, str | None, str | None, int]]:
    organizations = db.query(Organization).order_by(Organization.name).all()

    owner_rows = (
        db.query(Membership.organization_id, User.name, User.email)
        .join(User, User.id == Membership.user_id)
        .filter(Membership.role == MembershipRole.ORGANIZATION_OWNER)
        .all()
    )
    owners = {org_id: (name, email) for org_id, name, email in owner_rows}

    count_rows = (
        db.query(Membership.organization_id, func.count(Membership.id))
        .group_by(Membership.organization_id)
        .all()
    )
    counts: dict[uuid.UUID, int] = {org_id: count for org_id, count in count_rows}

    results = []
    for org in organizations:
        owner_name, owner_email = owners.get(org.id, (None, None))
        results.append((org, owner_name, owner_email, counts.get(org.id, 0)))
    return results


def list_users_with_organization_count(db: Session) -> list[tuple[User, int]]:
    users = db.query(User).order_by(User.name).all()
    count_rows = (
        db.query(Membership.user_id, func.count(Membership.id)).group_by(Membership.user_id).all()
    )
    counts: dict[uuid.UUID, int] = {user_id: count for user_id, count in count_rows}
    return [(u, counts.get(u.id, 0)) for u in users]


def get_user(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def count_organizations_for_user(db: Session, user_id: uuid.UUID) -> int:
    return db.query(func.count(Membership.id)).filter(Membership.user_id == user_id).scalar() or 0
