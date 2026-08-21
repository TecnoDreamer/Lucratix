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
    # values_callable: sem isso, SQLAlchemy usa o NOME do membro do enum
    # Python (ex.: "ACTIVE") como valor gravado no Postgres, nao o .value
    # (ex.: "active") - e o enum do Postgres (migrations) so aceita os
    # valores em minusculo, causando InvalidTextRepresentation em runtime
    # (bug real encontrado via e2e-ci, nao pego pelos testes que usam
    # Base.metadata.create_all em vez de Alembic).
    role: Mapped[MembershipRole] = mapped_column(
        SAEnum(
            MembershipRole,
            name="membership_role",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )
    status: Mapped[MembershipStatus] = mapped_column(
        SAEnum(
            MembershipStatus,
            name="membership_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        default=MembershipStatus.ACTIVE,
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="memberships")
    organization: Mapped["Organization"] = relationship(back_populates="memberships")
