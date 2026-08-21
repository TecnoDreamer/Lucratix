import uuid
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.user import User


class MembershipRole(StrEnum):
    """Papeis dentro de uma organizacao. Hierarquia (RN-009):
    ORGANIZATION_OWNER > ORGANIZATION_ADMIN > ANALYST > VIEWER.
    PLATFORM_ADMIN e global e vive em User.is_platform_admin, nao aqui.
    """

    ORGANIZATION_OWNER = "ORGANIZATION_OWNER"
    ORGANIZATION_ADMIN = "ORGANIZATION_ADMIN"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


# Ordem de hierarquia, do mais para o menos privilegiado (RN-009).
ROLE_HIERARCHY: list[MembershipRole] = [
    MembershipRole.ORGANIZATION_OWNER,
    MembershipRole.ORGANIZATION_ADMIN,
    MembershipRole.ANALYST,
    MembershipRole.VIEWER,
]


def role_rank(role: MembershipRole) -> int:
    """Menor indice = maior privilegio."""
    return ROLE_HIERARCHY.index(role)


class MembershipStatus(StrEnum):
    ACTIVE = "active"
    PENDING = "pending"


class Membership(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Vincula um User a uma Organization com um papel (RBAC). RN-008."""

    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "organization_id", name="uq_membership_user_org"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[MembershipRole] = mapped_column(
        SAEnum(MembershipRole, name="membership_role"), nullable=False
    )
    status: Mapped[MembershipStatus] = mapped_column(
        SAEnum(MembershipStatus, name="membership_status"),
        default=MembershipStatus.ACTIVE,
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="memberships")
    organization: Mapped["Organization"] = relationship(back_populates="memberships")
