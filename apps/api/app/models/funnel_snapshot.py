import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class FunnelSnapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """RF-020: valores das etapas do funil de uma organizacao em um periodo.
    Um registro por organizacao+periodo (RN-006: ordem fixa das etapas).
    """

    __tablename__ = "funnel_snapshots"
    __table_args__ = (
        UniqueConstraint("organization_id", "period", name="uq_funnel_snapshot_org_period"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    period: Mapped[date] = mapped_column(Date, nullable=False)

    impressions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    visits: Mapped[int | None] = mapped_column(Integer, nullable=True)
    leads: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mqls: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sqls: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opportunities: Mapped[int | None] = mapped_column(Integer, nullable=True)
    customers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    repeat_purchases: Mapped[int | None] = mapped_column(Integer, nullable=True)
