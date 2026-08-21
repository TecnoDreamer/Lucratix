import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaselineCreate(BaseModel):
    revenue: float | None = None
    profit: float | None = None
    margin: float | None = None
    customer_count: int | None = None
    cac: float | None = None
    conversion_rate: float | None = None
    average_ticket: float | None = None
    marketing_investment: float | None = None
    leads: int | None = None
    recurrence_rate: float | None = None
    notes: str | None = None


class BaselineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    created_by: uuid.UUID | None
    revenue: float | None
    profit: float | None
    margin: float | None
    customer_count: int | None
    cac: float | None
    conversion_rate: float | None
    average_ticket: float | None
    marketing_investment: float | None
    leads: int | None
    recurrence_rate: float | None
    notes: str | None
    created_at: datetime
