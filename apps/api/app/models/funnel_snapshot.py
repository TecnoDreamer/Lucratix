import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class FunnelSnapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """RF-020: valores das etapas do funil de uma organizacao em um periodo.
    Um registro por organizacao+periodo+canal (RN-006: ordem fixa das
    etapas). `channel_id` nulo = linha agregada (o funil da organizacao
    como um todo); `channel_id` preenchido = funil segmentado por canal
    (ver docs/funnel/MODELAGEM.md). O indice parcial abaixo garante no
    maximo uma linha agregada por organizacao+periodo — a constraint
    composta sozinha nao bastaria, porque o Postgres trata NULL como
    distinto em UNIQUE.
    """

    __tablename__ = "funnel_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "period", "channel_id", name="uq_funnel_snapshot_org_period_channel"
        ),
        Index(
            "ix_funnel_snapshot_org_period_aggregate",
            "organization_id",
            "period",
            unique=True,
            postgresql_where=text("channel_id IS NULL"),
        ),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    period: Mapped[date] = mapped_column(Date, nullable=False)
    channel_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("marketing_channels.id", ondelete="RESTRICT"), nullable=True
    )

    impressions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    visits: Mapped[int | None] = mapped_column(Integer, nullable=True)
    leads: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mqls: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sqls: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opportunities: Mapped[int | None] = mapped_column(Integer, nullable=True)
    customers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    repeat_purchases: Mapped[int | None] = mapped_column(Integer, nullable=True)
