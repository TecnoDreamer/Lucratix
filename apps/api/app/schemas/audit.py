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


class AuditLogPageRead(BaseModel):
    """Página de resultados de GET /audit-logs (paginação offset — auditoria
    de banco de 2026-08-27: o endpoint antes retornava sempre os 100
    registros mais recentes, sem forma de ver entradas mais antigas)."""

    items: list[AuditLogRead]
    total: int
    limit: int
    offset: int
