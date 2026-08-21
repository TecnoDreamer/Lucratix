import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    trade_name: str | None = Field(default=None, max_length=255)
    segment: str | None = Field(default=None, max_length=255)
    cnpj: str | None = Field(default=None, max_length=32)
    currency: str = Field(default="BRL", min_length=3, max_length=3)
    timezone: str = Field(default="America/Sao_Paulo", max_length=64)
    tracking_start_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    trade_name: str | None = Field(default=None, max_length=255)
    segment: str | None = Field(default=None, max_length=255)
    cnpj: str | None = Field(default=None, max_length=32)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    timezone: str | None = Field(default=None, max_length=64)
    tracking_start_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    trade_name: str | None
    segment: str | None
    cnpj: str | None
    currency: str
    timezone: str
    tracking_start_date: date | None
    notes: str | None
    created_at: datetime
    my_role: str | None = None
