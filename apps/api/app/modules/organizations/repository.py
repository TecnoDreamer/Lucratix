"""Camada de acesso a dado para Organization.

Toda leitura desta lista e sempre escopada a `user_id` (RF-009): um usuario
so ve organizacoes onde possui membership ativa. Leitura/escrita de uma
organizacao especifica depende de `OrganizationContext` (ver core/deps.py),
nunca de um `organization_id` cru sem cruzar com a membership do usuario.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.membership import Membership, MembershipRole, MembershipStatus
from app.models.organization import Organization


def list_organizations_for_user(db: Session, user_id: uuid.UUID) -> list[tuple[Organization, MembershipRole]]:
    rows = (
        db.query(Organization, Membership.role)
        .join(Membership, Membership.organization_id == Organization.id)
        .filter(Membership.user_id == user_id, Membership.status == MembershipStatus.ACTIVE)
        .order_by(Organization.name)
        .all()
    )
    return [(org, role) for org, role in rows]


def get_organization(db: Session, organization_id: uuid.UUID) -> Organization | None:
    return db.get(Organization, organization_id)


def create_organization_with_owner(
    db: Session, *, owner_id: uuid.UUID, **fields: object
) -> Organization:
    organization = Organization(**fields)
    db.add(organization)
    db.flush()

    membership = Membership(
        user_id=owner_id,
        organization_id=organization.id,
        role=MembershipRole.ORGANIZATION_OWNER,
        status=MembershipStatus.ACTIVE,
    )
    db.add(membership)
    db.flush()
    return organization
