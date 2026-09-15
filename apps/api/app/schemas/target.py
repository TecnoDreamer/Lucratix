import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.target import TargetMetric


class TargetUpsert(BaseModel):
    """RN-017: `value` fica deliberadamente sem `ge=0` — ao contrario dos
    campos de financeiro/marketing/funil, o significado de "negativo" aqui
    depende de `metric` (uma meta de `PROFIT`/`MARGIN` pode ser negativa,
    ex.: "sair de -10% de margem para -2% neste trimestre"), enquanto outras
    (`REVENUE`, `CAC`, `CONVERSION_RATE`, `AVERAGE_TICKET`,
    `RECURRENCE_RATE`) nao fariam sentido negativas. Um limite condicional
    por metrica e valido, mas fica fora do escopo minimo desta rodada
    (L-05) — ver docs/governanca/LACUNAS_ENCONTRADAS.md."""

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
