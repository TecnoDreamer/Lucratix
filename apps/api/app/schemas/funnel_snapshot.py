import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class FunnelSnapshotUpsert(BaseModel):
    """RN-017: as 8 etapas do funil sao contagens — nao existe visita,
    lead ou cliente negativo, entao `ge=0` rejeita entrada absurda com 422."""

    period: date
    # None = linha agregada (comportamento atual, inalterado). Um id
    # concreto cria/atualiza a linha segmentada daquele canal em vez da
    # agregada — sem tela propria para isso ainda (PR2), mas a API ja
    # aceita (ex.: import de CSV com coluna de canal).
    channel_id: uuid.UUID | None = None
    impressions: int | None = Field(default=None, ge=0)
    visits: int | None = Field(default=None, ge=0)
    leads: int | None = Field(default=None, ge=0)
    mqls: int | None = Field(default=None, ge=0)
    sqls: int | None = Field(default=None, ge=0)
    opportunities: int | None = Field(default=None, ge=0)
    customers: int | None = Field(default=None, ge=0)
    repeat_purchases: int | None = Field(default=None, ge=0)


class FunnelSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    period: date
    channel_id: uuid.UUID | None
    impressions: int | None
    visits: int | None
    leads: int | None
    mqls: int | None
    sqls: int | None
    opportunities: int | None
    customers: int | None
    repeat_purchases: int | None
