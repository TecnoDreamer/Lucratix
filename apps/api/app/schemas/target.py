import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.target import TargetMetric


class TargetUpsert(BaseModel):
    metric: TargetMetric
    period: date
    value: float


class TargetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    metric: TargetMetric
    period: date
    value: float
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
