import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class FunnelSnapshotUpsert(BaseModel):
    period: date
    # None = linha agregada (comportamento atual, inalterado). Um id
    # concreto cria/atualiza a linha segmentada daquele canal em vez da
    # agregada — sem tela propria para isso ainda (PR2), mas a API ja
    # aceita (ex.: import de CSV com coluna de canal).
    channel_id: uuid.UUID | None = None
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
    channel_id: uuid.UUID | None
    impressions: int | None
    visits: int | None
    leads: int | None
    mqls: int | None
    sqls: int | None
    opportunities: int | None
    customers: int | None
    repeat_purchases: int | None
