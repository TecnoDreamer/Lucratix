import uuid
from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.membership import Membership


class OrganizationStatus(StrEnum):
    """Ciclo de vida de uma organização (PR "gestão de empresas", 2026-09-01).

    Encerrar NUNCA apaga — congela (bloqueia escrita, preserva leitura e
    todo o histórico). Ver core/deps.py::_ensure_organization_writable, o
    único ponto que aplica esse bloqueio."""

    ACTIVE = "active"
    FROZEN = "frozen"


class Organization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Uma empresa/cliente acompanhado pela consultoria. Limite de isolamento multi-tenant."""

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    segment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cnpj: Mapped[str | None] = mapped_column(String(32), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="BRL", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="America/Sao_Paulo", nullable=False)
    tracking_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    # values_callable: mesmo cuidado de models/membership.py — sem isso, o
    # enum do Postgres recebe o NOME do membro Python ("ACTIVE"), nao o
    # .value ("active"), e quebra em runtime (InvalidTextRepresentation),
    # nao pego pelos testes (usam Base.metadata.create_all, nao Alembic).
    status: Mapped[OrganizationStatus] = mapped_column(
        SAEnum(
            OrganizationStatus,
            name="organization_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        default=OrganizationStatus.ACTIVE,
        nullable=False,
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    closure_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # URL completa (secure_url do Cloudinary) — nunca so um public_id: o
    # public_id e derivavel do proprio id da organizacao
    # (lucratix/organizations/<uuid>, ver core/storage.py), guardar so a
    # URL evita uma coluna redundante.
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
