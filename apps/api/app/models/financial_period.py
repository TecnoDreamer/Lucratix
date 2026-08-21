import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class FinancialPeriod(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Dados financeiros de uma organizacao em um periodo (RF-017).

    Guarda apenas os valores de entrada (receita, custos, despesas,
    investimento, impostos); lucro e margem sao DERIVADOS pela camada de
    metricas (Fase 13), nao armazenados aqui, para ter uma unica fonte de
    verdade para a formula (ver docs/analytics/metrics-catalog.md).
    """

    __tablename__ = "financial_periods"
    __table_args__ = (
        UniqueConstraint("organization_id", "period", name="uq_financial_period_org_period"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    period: Mapped[date] = mapped_column(Date, nullable=False)

    revenue: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    costs: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    expenses: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    marketing_investment: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    taxes: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
