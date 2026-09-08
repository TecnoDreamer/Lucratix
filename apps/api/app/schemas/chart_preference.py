"""Personalização de gráficos do Funil (PR3, persistência) — schemas de
validação por `chart_key`. Espelham o formato de
`apps/web/src/lib/chart-settings.ts` (nunca duplicam a DEFINIÇÃO de cada
preset, só o formato dos campos que o frontend manda salvar).

`CHART_PREFERENCE_SCHEMAS` é o "schema/allowlist" pedido pela seção 12 do
prompt de redesign: um `chart_key` fora daqui nunca é aceito (404, ver
router), e o corpo é sempre validado contra o schema exato daquele
`chart_key` antes de persistir — nunca se grava um JSON arbitrário.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class FunnelStagesChartPreferences(BaseModel):
    chart_type: Literal["funnel", "bars"]
    show_values: bool
    density: Literal["comfortable", "compact"]


class StageConversionChartPreferences(BaseModel):
    show_values: bool
    density: Literal["comfortable", "compact"]


CHART_PREFERENCE_SCHEMAS: dict[str, type[BaseModel]] = {
    "funnel-stages": FunnelStagesChartPreferences,
    "stage-conversion": StageConversionChartPreferences,
}


class ChartPreferencesUpdate(BaseModel):
    """`preferences: None` explícito é "restaurar o padrão" (grava NULL —
    mesmo espírito de `WorkspacePreferencesUpdate.quick_access`). A validação
    contra o schema do `chart_key` acontece no service/router (que schema
    usar depende do path param, não dá pra fixar aqui)."""

    preferences: dict[str, object] | None = None


class ChartPreferencesRead(BaseModel):
    organization_id: uuid.UUID
    chart_key: str
    preferences: dict[str, object] | None
    updated_at: datetime | None
