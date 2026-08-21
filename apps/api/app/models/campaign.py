import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Campaign(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Campanha de marketing. RN-005: pertence a exatamente um canal, e o
    canal precisa pertencer a mesma organizacao da campanha (verificado no
    service, nao apenas por FK — ver app/modules/campaigns/service.py).
    """

    __tablename__ = "campaigns"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    channel_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("marketing_channels.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    investment: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    impressions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    clicks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    leads: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opportunities: Mapped[int | None] = mapped_column(Integer, nullable=True)
    customers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attributed_revenue: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
