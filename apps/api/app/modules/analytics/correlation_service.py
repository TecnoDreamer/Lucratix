"""Correlação entre duas métricas mensais da Visão Executiva — camada fina,
mesmo espírito do resto de `analytics/`: recebe a série mensal já
calculada (`compute_monthly_series`), não acessa banco (RNF-016).
"""

from dataclasses import dataclass
from datetime import date

from app.modules.analytics.service import MonthlyMetrics
from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult


@dataclass(frozen=True)
class CorrelationPoint:
    period: date
    x: float | None
    y: float | None


def compute_correlation(
    monthly: list[MonthlyMetrics], metric_x: str, metric_y: str
) -> tuple[MetricResult, list[CorrelationPoint]]:
    """`points` tem um item por mês (mesmo quando um dos dois valores está
    ausente — alimenta o gráfico de dispersão com o mesmo tratamento de
    "buraco" dos outros gráficos, RN-003). O coeficiente, por outro lado,
    só usa os meses em que AMBAS as métricas são aplicáveis — um par com um
    lado ausente não pode entrar no cálculo sem distorcer o resultado.
    """
    points = [
        CorrelationPoint(
            period=m.period,
            x=m.metrics[metric_x].value if m.metrics[metric_x].is_applicable else None,
            y=m.metrics[metric_y].value if m.metrics[metric_y].is_applicable else None,
        )
        for m in monthly
    ]

    paired = [(p.x, p.y) for p in points if p.x is not None and p.y is not None]
    correlation_result = engine.correlation([x for x, _ in paired], [y for _, y in paired])

    return correlation_result, points
