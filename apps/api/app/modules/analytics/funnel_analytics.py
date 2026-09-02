"""RF funil multicanal (PR1, secao "KPIs" do prompt): conversao e abandono
etapa-a-etapa do funil. Separado de `analytics/service.py` pela mesma
razao que `funnels/` (CRUD de entrada manual) e `analytics/` (calculo) ja
sao modulos distintos — este arquivo so calcula, nao acessa o banco.

Contrato: mesmo de `metrics/engine.py` (RN-003/RN-004) — dado ausente ou
base zero nunca vira 0 nem excecao, sempre um MetricResult com
is_applicable=False.
"""

from dataclasses import dataclass

from app.models.funnel_snapshot import FunnelSnapshot
from app.modules.analytics.service import AggregatedFunnel
from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult

# Ordem fixa das etapas (RN-006), igual as colunas de FunnelSnapshot.
FUNNEL_STAGES: tuple[str, ...] = (
    "impressions",
    "visits",
    "leads",
    "mqls",
    "sqls",
    "opportunities",
    "customers",
    "repeat_purchases",
)

# Os 7 pares consecutivos de FUNNEL_STAGES — extraido para nao duplicar a
# logica de "zip com deslocamento" em mais de um lugar.
STAGE_TRANSITIONS: tuple[tuple[str, str], ...] = tuple(
    zip(FUNNEL_STAGES[:-1], FUNNEL_STAGES[1:], strict=True)
)


@dataclass(frozen=True)
class StageConversion:
    """Conversao e abandono de uma etapa para a proxima. O abandono nunca e
    um calculo independente: quando a conversao e aplicavel, abandono =
    1 - conversion.value; quando nao e (dado ausente ou base zero), o
    abandono herda o mesmo MetricResult nao-aplicavel da conversao — nunca
    `1 - None`.
    """

    from_stage: str
    to_stage: str
    conversion_rate: MetricResult
    drop_off_rate: MetricResult


def compute_stage_conversions(funnel: FunnelSnapshot | AggregatedFunnel) -> list[StageConversion]:
    conversions = []
    for from_stage, to_stage in STAGE_TRANSITIONS:
        base = getattr(funnel, from_stage)
        reached = getattr(funnel, to_stage)
        rate = engine.conversion_rate(conversions=reached, base=base)
        drop_off = (
            MetricResult.ok(1 - rate.value)
            if rate.is_applicable and rate.value is not None
            else MetricResult(value=None, is_applicable=False, reason=rate.reason)
        )
        conversions.append(
            StageConversion(
                from_stage=from_stage,
                to_stage=to_stage,
                conversion_rate=rate,
                drop_off_rate=drop_off,
            )
        )
    return conversions


def stage_values(funnel: FunnelSnapshot | AggregatedFunnel | None) -> dict[str, MetricResult]:
    """Um MetricResult por etapa — dado ausente (None) vira
    `MetricResult.missing_data`, nunca 0 (RN-003)."""
    return {
        stage: (
            MetricResult.ok(float(getattr(funnel, stage)))
            if funnel is not None and getattr(funnel, stage) is not None
            else MetricResult.missing_data(stage)
        )
        for stage in FUNNEL_STAGES
    }
