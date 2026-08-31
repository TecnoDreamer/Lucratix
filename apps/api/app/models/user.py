from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.membership import Membership


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Um usuario da plataforma. RN-011: email e identificador unico."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # RF-001, RN-004: ausencia (None) != nao verificado marcado como falso —
    # None e "nunca verificou", um timestamp e "verificou nesta data". Nunca
    # exposto cru pela API (ver UserRead.email_verified, so o booleano).
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # PLATFORM_ADMIN e um papel global, concedido fora do escopo de uma organizacao (RN-009),
    # por isso vive como flag no usuario e nao como Membership.role.
    is_platform_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def email_verified(self) -> bool:
        """Booleano derivado para a API (UserRead.email_verified) — nunca
        expõe `email_verified_at` cru, só se já verificou ou não."""
        return self.email_verified_at is not None
