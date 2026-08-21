import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field


class MarketingChannelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str | None = Field(default=None, max_length=100)


class MarketingChannelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    type: str | None
    created_at: datetime


class CampaignCreate(BaseModel):
    channel_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    investment: float | None = None
    impressions: int | None = None
    clicks: int | None = None
    leads: int | None = None
    opportunities: int | None = None
    customers: int | None = None
    attributed_revenue: float | None = None


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    investment: float | None = None
    impressions: int | None = None
    clicks: int | None = None
    leads: int | None = None
    opportunities: int | None = None
    customers: int | None = None
    attributed_revenue: float | None = None


class CampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    channel_id: uuid.UUID
    name: str
    start_date: date | None
    end_date: date | None
    investment: float | None
    impressions: int | None
    clicks: int | None
    leads: int | None
    opportunities: int | None
    customers: int | None
    attributed_revenue: float | None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def roas(self) -> float | None:
        """RN-003: sem investimento ou investimento=0 => nao aplicavel."""
        if (
            self.attributed_revenue is None
            or self.investment is None
            or self.investment == 0
        ):
            return None
        return self.attributed_revenue / self.investment

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ctr(self) -> float | None:
        if self.clicks is None or self.impressions is None or self.impressions == 0:
            return None
        return self.clicks / self.impressions
