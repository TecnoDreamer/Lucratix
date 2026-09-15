import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.modules.metrics import engine


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


# RN-017: investimento e as 5 contagens nao tem sentido de negocio negativo
# (`ge=0` rejeita com 422). `attributed_revenue` fica de fora deliberadamente
# — um estorno/chargeback atribuido a campanha e um cenario legitimo de
# receita atribuida negativa.


class CampaignCreate(BaseModel):
    channel_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    investment: float | None = Field(default=None, ge=0)
    impressions: int | None = Field(default=None, ge=0)
    clicks: int | None = Field(default=None, ge=0)
    leads: int | None = Field(default=None, ge=0)
    opportunities: int | None = Field(default=None, ge=0)
    customers: int | None = Field(default=None, ge=0)
    attributed_revenue: float | None = None


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    investment: float | None = Field(default=None, ge=0)
    impressions: int | None = Field(default=None, ge=0)
    clicks: int | None = Field(default=None, ge=0)
    leads: int | None = Field(default=None, ge=0)
    opportunities: int | None = Field(default=None, ge=0)
    customers: int | None = Field(default=None, ge=0)
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
        """Via app/modules/metrics/engine.py — fonte unica da formula
        (RN-003: sem investimento ou investimento=0 => nao aplicavel)."""
        return engine.roas(
            attributed_revenue=self.attributed_revenue, investment=self.investment
        ).value

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ctr(self) -> float | None:
        return engine.ctr(clicks=self.clicks, impressions=self.impressions).value
