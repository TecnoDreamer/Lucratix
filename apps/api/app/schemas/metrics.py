from datetime import date

from pydantic import BaseModel

from app.modules.metrics.engine import MetricResult, PeriodComparison


class MetricResultRead(BaseModel):
    value: float | None
    is_applicable: bool
    reason: str | None

    @classmethod
    def from_result(cls, result: MetricResult) -> "MetricResultRead":
        return cls(value=result.value, is_applicable=result.is_applicable, reason=result.reason)


class DashboardRead(BaseModel):
    revenue: MetricResultRead
    profit: MetricResultRead
    margin: MetricResultRead
    cac: MetricResultRead
    conversion_rate: MetricResultRead
    average_ticket: MetricResultRead
    recurrence_rate: MetricResultRead


class PeriodComparisonRead(BaseModel):
    baseline_value: float | None
    current_value: float | None
    absolute_change: float | None
    percent_change: float | None

    @classmethod
    def from_comparison(cls, comparison: PeriodComparison) -> "PeriodComparisonRead":
        return cls(
            baseline_value=comparison.baseline_value,
            current_value=comparison.current_value,
            absolute_change=comparison.absolute_change,
            percent_change=comparison.percent_change,
        )


class MetricWithComparisonRead(BaseModel):
    """Um KPI do periodo atual, com sua comparacao contra o periodo anterior
    equivalente (secao 6 do prompt de BI). Quando o periodo atual ou o
    anterior nao tem dado para essa metrica, `comparison.absolute_change`/
    `percent_change` ficam None (RN-003: nunca vira "0% de variacao")."""

    current: MetricResultRead
    comparison: PeriodComparisonRead


class ExecutiveDashboardRead(BaseModel):
    """RF-023: visao executiva por intervalo de datas (nao mais so um mes),
    com comparacao periodo-contra-periodo em cada KPI e transparencia sobre
    quantos meses do intervalo realmente tem dado (RN-003: nunca apresentar
    dado parcial como se fosse o intervalo inteiro sem avisar)."""

    date_from: date
    date_to: date
    previous_date_from: date
    previous_date_to: date
    months_in_range: int
    months_with_financial_data: int
    months_with_funnel_data: int

    revenue: MetricWithComparisonRead
    profit: MetricWithComparisonRead
    margin: MetricWithComparisonRead
    cac: MetricWithComparisonRead
    conversion_rate: MetricWithComparisonRead
    average_ticket: MetricWithComparisonRead
    recurrence_rate: MetricWithComparisonRead


class MonthlyMetricsRead(BaseModel):
    """Um ponto da série mensal — mesmos 7 KPIs do dashboard executivo,
    calculados isoladamente para este mês (não acumulado)."""

    period: date
    revenue: MetricResultRead
    profit: MetricResultRead
    margin: MetricResultRead
    cac: MetricResultRead
    conversion_rate: MetricResultRead
    average_ticket: MetricResultRead
    recurrence_rate: MetricResultRead


class ExecutiveSeriesRead(BaseModel):
    """Série mensal de KPIs para gráficos de evolução (um ponto por mês de
    calendário tocado pelo intervalo). Mês sem dado aparece com
    `is_applicable=False` em cada métrica (RN-003), nunca omitido — quem
    desenha o gráfico decide como representar o buraco."""

    date_from: date
    date_to: date
    points: list[MonthlyMetricsRead]


class MarketingAnalyticsRead(BaseModel):
    """Métricas de campanha por intervalo de datas — ROAS, ROI, CTR, CPC,
    CPM, CPL, CPA. Campanhas sem `start_date` nem `end_date` são excluídas
    (não há como saber se rodaram dentro do intervalo — ver
    `marketing/repository.py::list_campaigns_in_range`)."""

    date_from: date
    date_to: date
    previous_date_from: date
    previous_date_to: date
    campaign_count: int

    roas: MetricWithComparisonRead
    roi: MetricWithComparisonRead
    ctr: MetricWithComparisonRead
    cpc: MetricWithComparisonRead
    cpm: MetricWithComparisonRead
    cpl: MetricWithComparisonRead
    cpa: MetricWithComparisonRead
