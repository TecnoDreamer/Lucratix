"""Progresso de metas — camada fina, mesmo espirito do resto de
`analytics/`: recebe os `Target` ja buscados, nao acessa o banco
diretamente (RNF-016).
"""

from dataclasses import dataclass
from datetime import date

from app.models.target import Target, TargetMetric
from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult

# Meta so pode ser somada ao longo de varios meses pra metrica genuinamente
# aditiva (moeda "bruta", nao uma razao) — receita e lucro. As outras 5 sao
# razoes (CAC = investimento/clientes, ticket medio = receita/clientes,
# margem, conversao, recorrencia); somar a meta mensal delas nao representa
# "a meta do intervalo" de forma matematicamente valida — o mesmo problema
# de somar 5 CACs mensais e chamar de "CAC do trimestre" sem pesar pelo
# volume de cada mes. Por isso essas 5 so comparam meta mes a mes (grafico
# de evolucao, `monthly_targets_by_period`), nunca agregada num unico
# numero pro intervalo inteiro.
_SUMMABLE_TARGET_METRICS = {TargetMetric.REVENUE, TargetMetric.PROFIT}

_NOT_SUMMABLE_REASON = (
    "meta nao agregavel nesta metrica (é uma razão, não soma) — compare mês a mês no gráfico"
)


@dataclass(frozen=True)
class TargetProgress:
    target_value: float | None
    percent_of_target: MetricResult


def aggregate_target_progress(
    metric: TargetMetric, targets: list[Target], current_value: float | None
) -> TargetProgress:
    if metric not in _SUMMABLE_TARGET_METRICS:
        return TargetProgress(
            target_value=None,
            percent_of_target=MetricResult(value=None, is_applicable=False, reason=_NOT_SUMMABLE_REASON),
        )

    values = [float(t.value) for t in targets if t.metric == metric]
    target_value = sum(values) if values else None
    return TargetProgress(
        target_value=target_value,
        percent_of_target=engine.target_progress(current_value, target_value),
    )


def monthly_targets_by_period(targets: list[Target]) -> dict[date, dict[str, float]]:
    """Agrupa por mes -> {metric: value} — pra cruzar com `months_between`
    no router e montar um ponto por mes mesmo quando só algumas métricas
    têm meta definida naquele mês."""
    by_period: dict[date, dict[str, float]] = {}
    for t in targets:
        by_period.setdefault(t.period, {})[t.metric.value] = float(t.value)
    return by_period
