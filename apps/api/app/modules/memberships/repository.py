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


def list_memberships_with_user(
    db: Session, organization_id: uuid.UUID
) -> list[tuple[Membership, User]]:
    """Mesma lista de `list_memberships`, com o `User` já carregado — para
    telas que precisam mostrar nome/e-mail de cada membro sem N+1 (painel de
    Super Admin e futura tela de equipe por organização)."""
    rows = (
        db.query(Membership, User)
        .join(User, User.id == Membership.user_id)
        .filter(Membership.organization_id == organization_id)
        .order_by(Membership.created_at)
        .all()
    )
    return [(m, u) for m, u in rows]


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
