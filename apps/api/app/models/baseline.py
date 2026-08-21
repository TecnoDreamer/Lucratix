import uuid

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class Baseline(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Snapshot historico da situacao da organizacao antes/durante o acompanhamento.

    Append-only por design (ADR-0005, RN-002): nenhum repository/router deste
    projeto deve expor UPDATE ou DELETE para esta tabela. O "baseline vigente"
    e sempre o registro mais recente (MAX(created_at)) de uma organizacao.

    Todos os campos de indicador sao opcionais (nullable): ausencia de dado
    e representada como `None`, nunca como `0` (RN-004).
    """

    __tablename__ = "baselines"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    revenue: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    profit: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    margin: Mapped[float | None] = mapped_column(Numeric(7, 4), nullable=True)
    customer_count: Mapped[int | None] = mapped_column(nullable=True)
    cac: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    conversion_rate: Mapped[float | None] = mapped_column(Numeric(7, 4), nullable=True)
    average_ticket: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    marketing_investment: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    leads: Mapped[int | None] = mapped_column(nullable=True)
    recurrence_rate: Mapped[float | None] = mapped_column(Numeric(7, 4), nullable=True)
    notes: Mapped[str | None] = mapped_column(nullable=True)
