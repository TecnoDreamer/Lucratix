"""Motor de metricas (Fase 13, RF-021).

Contrato obrigatorio de toda funcao deste modulo (RN-003, RN-004,
RNF-011, RNF-012 — ver docs/analytics/metrics-catalog.md):

- Nunca divide por zero: denominador ausente ou igual a zero produz um
  MetricResult com is_applicable=False, nunca uma excecao nao tratada.
- Nunca trata ausencia de dado como zero: um campo de entrada `None`
  produz is_applicable=False, nunca e silenciosamente convertido em 0.

Este modulo e deliberadamente puro (sem SQLAlchemy, sem FastAPI): recebe
numeros, devolve MetricResult. Isso o torna testavel em isolamento
(RNF-016) e reutilizavel por rotas, relatorios ou, futuramente, jobs
assincronos.
"""

import statistics
from dataclasses import dataclass
from decimal import Decimal

# Numeric columns do SQLAlchemy (ver app/models/*.py) chegam aqui como
# decimal.Decimal, nao float — Python nao permite aritmetica misturando
# Decimal e float (ex.: Decimal("1") * 1.0 levanta TypeError), entao todo
# valor numerico de entrada e convertido para float assim que entra neste
# modulo (ver _as_float), garantindo que o dado real do banco funcione
# igual ao dado sintetico usado nos testes unitarios.
Number = int | float | Decimal


def _as_float(value: Number) -> float:
    return float(value)


@dataclass(frozen=True)
class MetricResult:
    value: float | None
    is_applicable: bool
    reason: str | None = None

    @staticmethod
    def ok(value: float) -> "MetricResult":
        return MetricResult(value=value, is_applicable=True, reason=None)

    @staticmethod
    def missing_data(field: str) -> "MetricResult":
        return MetricResult(value=None, is_applicable=False, reason=f"dado ausente: {field}")

    @staticmethod
    def division_by_zero(denominator_field: str) -> "MetricResult":
        return MetricResult(
            value=None,
            is_applicable=False,
            reason=f"divisao por zero: {denominator_field}",
        )


def _safe_ratio(
    numerator: Number | None,
    denominator: Number | None,
    *,
    numerator_field: str,
    denominator_field: str,
    multiplier: float = 1.0,
) -> MetricResult:
    if numerator is None:
        return MetricResult.missing_data(numerator_field)
    if denominator is None:
        return MetricResult.missing_data(denominator_field)
    if denominator == 0:
        return MetricResult.division_by_zero(denominator_field)
    return MetricResult.ok((_as_float(numerator) / _as_float(denominator)) * multiplier)


def margin(revenue: Number | None, profit: Number | None) -> MetricResult:
    return _safe_ratio(profit, revenue, numerator_field="profit", denominator_field="revenue")


def profit(
    revenue: Number | None,
    costs: Number | None,
    expenses: Number | None,
    taxes: Number | None,
) -> MetricResult:
    if revenue is None:
        return MetricResult.missing_data("revenue")
    return MetricResult.ok(
        _as_float(revenue) - _as_float(costs or 0) - _as_float(expenses or 0) - _as_float(taxes or 0)
    )


def cac(marketing_investment: Number | None, new_customers: Number | None) -> MetricResult:
    return _safe_ratio(
        marketing_investment,
        new_customers,
        numerator_field="marketing_investment",
        denominator_field="new_customers",
    )


def roas(attributed_revenue: Number | None, investment: Number | None) -> MetricResult:
    return _safe_ratio(
        attributed_revenue, investment, numerator_field="attributed_revenue", denominator_field="investment"
    )


def roi(attributed_revenue: Number | None, investment: Number | None) -> MetricResult:
    if attributed_revenue is None:
        return MetricResult.missing_data("attributed_revenue")
    if investment is None:
        return MetricResult.missing_data("investment")
    if investment == 0:
        return MetricResult.division_by_zero("investment")
    revenue_f, investment_f = _as_float(attributed_revenue), _as_float(investment)
    return MetricResult.ok((revenue_f - investment_f) / investment_f)


def ltv(
    average_ticket: Number | None,
    purchase_frequency: Number | None,
    retention_time: Number | None,
) -> MetricResult:
    if average_ticket is None:
        return MetricResult.missing_data("average_ticket")
    if purchase_frequency is None:
        return MetricResult.missing_data("purchase_frequency")
    if retention_time is None:
        return MetricResult.missing_data("retention_time")
    return MetricResult.ok(
        _as_float(average_ticket) * _as_float(purchase_frequency) * _as_float(retention_time)
    )


def conversion_rate(conversions: Number | None, base: Number | None) -> MetricResult:
    return _safe_ratio(conversions, base, numerator_field="conversions", denominator_field="base")


def average_ticket(revenue: Number | None, count: Number | None) -> MetricResult:
    return _safe_ratio(revenue, count, numerator_field="revenue", denominator_field="count")


def cpl(investment: Number | None, leads: Number | None) -> MetricResult:
    return _safe_ratio(investment, leads, numerator_field="investment", denominator_field="leads")


def cpa(investment: Number | None, conversions: Number | None) -> MetricResult:
    return _safe_ratio(
        investment, conversions, numerator_field="investment", denominator_field="conversions"
    )


def ctr(clicks: Number | None, impressions: Number | None) -> MetricResult:
    return _safe_ratio(clicks, impressions, numerator_field="clicks", denominator_field="impressions")


def cpc(investment: Number | None, clicks: Number | None) -> MetricResult:
    return _safe_ratio(investment, clicks, numerator_field="investment", denominator_field="clicks")


def cpm(investment: Number | None, impressions: Number | None) -> MetricResult:
    return _safe_ratio(
        investment,
        impressions,
        numerator_field="investment",
        denominator_field="impressions",
        multiplier=1000,
    )


def retention_rate(active_end: Number | None, active_start: Number | None) -> MetricResult:
    return _safe_ratio(
        active_end, active_start, numerator_field="active_end", denominator_field="active_start"
    )


def churn_rate(active_end: Number | None, active_start: Number | None) -> MetricResult:
    retention = retention_rate(active_end, active_start)
    if not retention.is_applicable or retention.value is None:
        return retention
    return MetricResult.ok(1 - retention.value)


def target_progress(current: Number | None, target: Number | None) -> MetricResult:
    """Progresso em relacao a uma meta — `current / target` (ex.: 0.83 =
    83% da meta atingida). Mesma semantica de seguranca de `_safe_ratio`:
    meta ausente ou zero, ou valor atual ausente, vira `is_applicable=False`
    (RN-003), nunca 0% ou excecao."""
    return _safe_ratio(current, target, numerator_field="current", denominator_field="target")


# Minimo de pares pra calcular correlacao — com 2 pontos, qualquer reta
# conecta os dois perfeitamente (r sempre +-1), o que nao significa nada
# estatisticamente. 3 e o minimo pra o numero comecar a ter algum sentido,
# mesmo sendo ainda pouco (a UI mostra `months_used` pra transparencia —
# RN-003, nunca apresentar um numero sem contexto de quanto dado o sustenta).
_MIN_CORRELATION_POINTS = 3


def correlation(x: list[Number], y: list[Number]) -> MetricResult:
    """Correlacao de Pearson entre duas series pareadas (mesmo indice = mesmo
    mes, ja filtradas pelo chamador pra so incluir meses com as duas
    metricas aplicaveis — ver `analytics/correlation_service.py`). Nunca
    afirma causalidade, so a correlacao observada (mesmo espirito de
    `PeriodComparison`, que deliberadamente nao tem campo de "causa").
    """
    if len(x) != len(y):
        raise ValueError("x e y precisam ter o mesmo tamanho")
    if len(x) < _MIN_CORRELATION_POINTS:
        return MetricResult(
            value=None,
            is_applicable=False,
            reason=f"poucos meses com as duas métricas aplicáveis (mínimo {_MIN_CORRELATION_POINTS})",
        )
    try:
        r = statistics.correlation([_as_float(v) for v in x], [_as_float(v) for v in y])
    except statistics.StatisticsError:
        # Uma das duas series nao varia no periodo (todo mes com o mesmo
        # valor) — correlacao matematicamente indefinida, nao "0".
        return MetricResult(
            value=None,
            is_applicable=False,
            reason="uma das métricas não varia no período — correlação indefinida",
        )
    return MetricResult.ok(r)


def recurrence_rate(repeat_customers: Number | None, total_customers: Number | None) -> MetricResult:
    return _safe_ratio(
        repeat_customers,
        total_customers,
        numerator_field="repeat_customers",
        denominator_field="total_customers",
    )


@dataclass(frozen=True)
class PeriodComparison:
    """RF-022, RN-007: comparacao entre dois pontos no tempo. Deliberadamente
    NAO tem nenhum campo do tipo "causa"/"atribuicao" — apenas a variacao
    observada. A camada de apresentacao e responsavel por nao insinuar
    causalidade a partir deste resultado.
    """

    baseline_value: float | None
    current_value: float | None
    absolute_change: float | None
    percent_change: float | None


def compare_periods(baseline_value: Number | None, current_value: Number | None) -> PeriodComparison:
    if baseline_value is None or current_value is None:
        return PeriodComparison(
            baseline_value=float(baseline_value) if baseline_value is not None else None,
            current_value=float(current_value) if current_value is not None else None,
            absolute_change=None,
            percent_change=None,
        )

    baseline_f, current_f = _as_float(baseline_value), _as_float(current_value)
    absolute_change = current_f - baseline_f
    percent_change = None if baseline_f == 0 else absolute_change / baseline_f

    return PeriodComparison(
        baseline_value=baseline_f,
        current_value=current_f,
        absolute_change=absolute_change,
        percent_change=percent_change,
    )
