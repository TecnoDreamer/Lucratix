import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID | None
    user_id: uuid.UUID | None
    action: str
    entity: str
    entity_id: uuid.UUID | None
    created_at: datetime
