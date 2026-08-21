import uuid

from sqlalchemy.orm import Session

from app.models.membership import Membership, MembershipRole, MembershipStatus
from app.models.user import User


def list_memberships(db: Session, organization_id: uuid.UUID) -> list[Membership]:
    return (
        db.query(Membership)
        .filter(Membership.organization_id == organization_id)
        .order_by(Membership.created_at)
        .all()
    )


def get_membership(db: Session, organization_id: uuid.UUID, membership_id: uuid.UUID) -> Membership | None:
    return (
        db.query(Membership)
        .filter(Membership.id == membership_id, Membership.organization_id == organization_id)
        .one_or_none()
    )


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).one_or_none()


def add_membership(
    db: Session, *, user_id: uuid.UUID, organization_id: uuid.UUID, role: MembershipRole
) -> Membership:
    membership = Membership(
        user_id=user_id,
        organization_id=organization_id,
        role=role,
        status=MembershipStatus.ACTIVE,
    )
    db.add(membership)
    db.flush()
    return membership
