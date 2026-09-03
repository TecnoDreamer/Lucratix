"""RF funil multicanal (PR1, secao "KPIs" do prompt): conversao e abandono
etapa-a-etapa do funil. Separado de `analytics/service.py` pela mesma
razao que `funnels/` (CRUD de entrada manual) e `analytics/` (calculo) ja
sao modulos distintos — este arquivo so calcula, nao acessa o banco.

Contrato: mesmo de `metrics/engine.py` (RN-003/RN-004) — dado ausente ou
base zero nunca vira 0 nem excecao, sempre um MetricResult com
is_applicable=False.
"""

from dataclasses import dataclass

from app.core.formatting import format_percentage
from app.models.funnel_snapshot import FunnelSnapshot
from app.modules.analytics.service import AggregatedFunnel
from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult

# Rotulo pt-BR de cada etapa, para texto (relatorio em PDF) — mesma lista
# de STAGE_LABELS em apps/web/src/lib/funnel-insights.ts (duplicado de
# proposito: sao 2 runtimes diferentes, nenhum deles importa arquivo do
# outro; mesma escolha ja feita la de nao passar por i18n neste texto
# determinístico).
_STAGE_LABELS_PT_BR: dict[str, str] = {
    "impressions": "Impressões",
    "visits": "Visitas",
    "leads": "Leads",
    "mqls": "MQLs",
    "sqls": "SQLs",
    "opportunities": "Oportunidades",
    "customers": "Clientes",
    "repeat_purchases": "Recompras",
}

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


def _find_bottleneck(conversions: list[StageConversion]) -> StageConversion | None:
    """A etapa com a menor taxa de conversao aplicavel entre as 7 — nunca
    um calculo novo, so o minimo dos valores ja computados. `None` quando
    nenhuma conversao e aplicavel (sem dado no periodo)."""
    applicable = [
        c for c in conversions if c.conversion_rate.is_applicable and c.conversion_rate.value is not None
    ]
    if not applicable:
        return None

    def _rate(conversion: StageConversion) -> float:
        assert conversion.conversion_rate.value is not None  # ja filtrado em `applicable`
        return conversion.conversion_rate.value

    return min(applicable, key=_rate)


def describe_bottleneck(conversions: list[StageConversion]) -> str | None:
    """Observacao deterministica (RF: deteccao de gargalo, sem linguagem
    causal) — mesma regra de `findBottleneck`/`computeFunnelInsights` em
    apps/web/src/lib/funnel-insights.ts, aqui como texto pt-BR pro
    relatorio em PDF. `None` quando nao ha nenhuma conversao aplicavel."""
    bottleneck = _find_bottleneck(conversions)
    if bottleneck is None or bottleneck.conversion_rate.value is None:
        return None
    from_label = _STAGE_LABELS_PT_BR[bottleneck.from_stage]
    to_label = _STAGE_LABELS_PT_BR[bottleneck.to_stage]
    return (
        f"A menor taxa de conversão do período está entre {from_label} e {to_label}: "
        f"{format_percentage(bottleneck.conversion_rate.value)}."
    )


def describe_biggest_mover(current: list[StageConversion], previous: list[StageConversion]) -> str | None:
    """Observacao deterministica — a conversao com a maior variacao (em
    modulo) de taxa entre o periodo atual e o anterior equivalente. Mesma
    regra do segundo insight de `computeFunnelInsights`
    (funnel-insights.ts). `current`/`previous` precisam estar na mesma
    ordem de STAGE_TRANSITIONS (garantido por quem monta as duas listas
    via `compute_stage_conversions`). `None` quando nenhuma comparacao e
    aplicavel (dado insuficiente num dos dois lados em todas as etapas)."""
    biggest: tuple[StageConversion, float] | None = None
    for curr, prev in zip(current, previous, strict=True):
        if not curr.conversion_rate.is_applicable or curr.conversion_rate.value is None:
            continue
        comparison = engine.compare_periods(prev.conversion_rate.value, curr.conversion_rate.value)
        if comparison.percent_change is None:
            continue
        if biggest is None or abs(comparison.percent_change) > abs(biggest[1]):
            biggest = (curr, comparison.percent_change)

    if biggest is None:
        return None
    conversion, percent_change = biggest
    from_label = _STAGE_LABELS_PT_BR[conversion.from_stage]
    to_label = _STAGE_LABELS_PT_BR[conversion.to_stage]
    return (
        f"A conversão de {from_label} para {to_label} teve a maior variação do período: "
        f"{format_percentage(percent_change, signed=True)} vs. o período anterior."
    )
