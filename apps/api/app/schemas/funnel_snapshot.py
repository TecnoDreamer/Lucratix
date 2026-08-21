import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class FunnelSnapshotUpsert(BaseModel):
    period: date
    impressions: int | None = None
    visits: int | None = None
    leads: int | None = None
    mqls: int | None = None
    sqls: int | None = None
    opportunities: int | None = None
    customers: int | None = None
    repeat_purchases: int | None = None


class FunnelSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    period: date
    impressions: int | None
    visits: int | None
    leads: int | None
    mqls: int | None
    sqls: int | None
    opportunities: int | None
    customers: int | None
    repeat_purchases: int | None
