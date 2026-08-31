import uuid
from datetime import date
from enum import StrEnum

from sqlalchemy import Date, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class TargetMetric(StrEnum):
    """As unicas metricas que aceitam meta hoje — os 7 KPIs da Visao
    Executiva (mesmo conjunto de `_DASHBOARD_METRIC_KEYS` em
    `analytics/router.py`). Marketing (ROAS, CAC por campanha) fica de
    fora nesta rodada — dado consultavel, mas sem interface pra definir
    meta ainda (ver docs/analytics/CHART_DECISIONS.md)."""

    REVENUE = "revenue"
    PROFIT = "profit"
    MARGIN = "margin"
    CAC = "cac"
    CONVERSION_RATE = "conversion_rate"
    AVERAGE_TICKET = "average_ticket"
    RECURRENCE_RATE = "recurrence_rate"


class Target(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Meta de um KPI para um mes especifico da organizacao.

    Granularidade mensal, mesmo grao de `FinancialPeriod`/`FunnelSnapshot`
    (`period` sempre dia 1 do mes) — nao existe meta por intervalo livre
    (decisao registrada em docs/analytics/CHART_DECISIONS.md: a agregacao
    de meta por intervalo so faz sentido pra metrica de moeda, somando os
    meses tocados; pra metrica de percentual/taxa nao ha uma forma de
    somar metas mensais sem inventar uma regra nova).

    `value` guarda o numero na mesma unidade que `MetricResult.value` ja
    usa pra essa metrica — moeda em valor cheio (ex.: 50000.00 pra receita)
    ou taxa como razao 0-1 (ex.: 0.40 pra uma meta de 40% de margem), nunca
    multiplicado por 100.
    """

    __tablename__ = "targets"
    __table_args__ = (
        UniqueConstraint("organization_id", "metric", "period", name="uq_targets_org_metric_period"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    # values_callable: ver comentario equivalente em app/models/membership.py.
    metric: Mapped[TargetMetric] = mapped_column(
        SAEnum(
            TargetMetric,
            name="target_metric",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )
    period: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
