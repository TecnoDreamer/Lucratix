import uuid
from datetime import date

from pydantic import BaseModel

from app.modules.analytics.funnel_analytics import FUNNEL_STAGES, StageConversion
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


class TargetProgressRead(BaseModel):
    """Progresso em relação à meta somada ao longo do intervalo — só
    aplicável para receita/lucro (metricas aditivas). Para as outras 5
    métricas (razões: margem, CAC, conversão, ticket médio, recorrência),
    `target_value` vem None e `percent_of_target.reason` explica por quê —
    a meta delas só é comparável mês a mês (ver `points_with_targets`)."""

    target_value: float | None
    percent_of_target: MetricResultRead


class MonthlyTargetRead(BaseModel):
    """Meta bruta (sem comparação) de cada KPI para um mês específico —
    `None` quando não há meta definida para aquele KPI naquele mês. Usado
    pela linha de meta no gráfico de evolução; ao contrário de
    `TargetProgressRead`, vale para as 7 métricas (não é uma soma)."""

    period: date
    revenue: float | None
    profit: float | None
    margin: float | None
    cac: float | None
    conversion_rate: float | None
    average_ticket: float | None
    recurrence_rate: float | None


class ExecutiveTargetsRead(BaseModel):
    date_from: date
    date_to: date

    revenue: TargetProgressRead
    profit: TargetProgressRead
    margin: TargetProgressRead
    cac: TargetProgressRead
    conversion_rate: TargetProgressRead
    average_ticket: TargetProgressRead
    recurrence_rate: TargetProgressRead

    monthly: list[MonthlyTargetRead]


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


class ChannelMarketingRead(BaseModel):
    """As mesmas 7 métricas de `MarketingAnalyticsRead`, mas agregadas só
    das campanhas de um canal — sem comparação com período anterior (RF
    diferente: aqui o "antes/depois" já não é o eixo, é "canal A vs. canal
    B" no mesmo período)."""

    channel_id: uuid.UUID
    channel_name: str
    campaign_count: int

    roas: MetricResultRead
    roi: MetricResultRead
    ctr: MetricResultRead
    cpc: MetricResultRead
    cpm: MetricResultRead
    cpl: MetricResultRead
    cpa: MetricResultRead


class MarketingByChannelRead(BaseModel):
    """Drill-down de `GET /analytics/marketing` por canal — mesmo critério
    de campanha incluída (`marketing/repository.py::list_campaigns_in_range`).
    Só canais com pelo menos uma campanha no intervalo aparecem."""

    date_from: date
    date_to: date
    channels: list[ChannelMarketingRead]


class CorrelationPointRead(BaseModel):
    """Um ponto do gráfico de dispersão — um por mês do intervalo, mesmo
    quando uma das duas métricas está ausente naquele mês (`x`/`y` ficam
    `None`, nunca 0 — RN-003)."""

    period: date
    x: float | None
    y: float | None


class ExecutiveCorrelationRead(BaseModel):
    """Correlação de Pearson entre duas métricas mensais da Visão Executiva.
    `correlation.is_applicable=False` quando há menos de 3 meses com as
    duas métricas aplicáveis, ou quando uma delas não varia no período —
    nunca um coeficiente calculado sobre poucos pontos ou indefinido."""

    date_from: date
    date_to: date
    metric_x: str
    metric_y: str
    months_used: int
    correlation: MetricResultRead
    points: list[CorrelationPointRead]


class FunnelStagesRead(BaseModel):
    """Um MetricResult por etapa do funil (RN-006: ordem fixa de
    FUNNEL_STAGES). Etapa sem dado vem com `is_applicable=False`, nunca 0
    (RN-003)."""

    impressions: MetricResultRead
    visits: MetricResultRead
    leads: MetricResultRead
    mqls: MetricResultRead
    sqls: MetricResultRead
    opportunities: MetricResultRead
    customers: MetricResultRead
    repeat_purchases: MetricResultRead

    @classmethod
    def from_stage_values(cls, values: dict[str, MetricResult]) -> "FunnelStagesRead":
        return cls(**{stage: MetricResultRead.from_result(values[stage]) for stage in FUNNEL_STAGES})


class StageConversionRead(BaseModel):
    """Conversao e abandono de uma etapa para a proxima, sem comparacao com
    periodo anterior — usado no drill-down por canal (o eixo ali e "canal A
    vs. canal B", nao "antes vs. depois")."""

    from_stage: str
    to_stage: str
    conversion_rate: MetricResultRead
    drop_off_rate: MetricResultRead

    @classmethod
    def from_stage_conversion(cls, conversion: StageConversion) -> "StageConversionRead":
        return cls(
            from_stage=conversion.from_stage,
            to_stage=conversion.to_stage,
            conversion_rate=MetricResultRead.from_result(conversion.conversion_rate),
            drop_off_rate=MetricResultRead.from_result(conversion.drop_off_rate),
        )


class StageConversionWithComparisonRead(BaseModel):
    """Igual a StageConversionRead, mas com a taxa de conversao comparada
    contra o periodo anterior equivalente (RN-003: nunca "0% de variacao"
    quando falta dado num dos dois lados). A contagem bruta de cada etapa
    nao e comparada aqui — o KPI e a taxa, nao o volume absoluto."""

    from_stage: str
    to_stage: str
    conversion_rate: MetricResultRead
    drop_off_rate: MetricResultRead
    conversion_rate_comparison: PeriodComparisonRead


class FunnelAnalyticsRead(BaseModel):
    """GET /analytics/funnel — funil agregado (todos os canais juntos) num
    intervalo de datas, com conversao/abandono etapa-a-etapa e comparacao
    periodo-a-periodo de cada taxa de conversao."""

    date_from: date
    date_to: date
    previous_date_from: date
    previous_date_to: date
    stages: FunnelStagesRead
    conversions: list[StageConversionWithComparisonRead]


class ChannelFunnelRead(BaseModel):
    """Drill-down de FunnelAnalyticsRead por canal — mesmo criterio de
    `MarketingByChannelRead`/`ChannelMarketingRead`: sem comparacao de
    periodo, o eixo aqui e canal A vs. canal B."""

    channel_id: uuid.UUID
    channel_name: str
    stages: FunnelStagesRead
    conversions: list[StageConversionRead]


class FunnelByChannelRead(BaseModel):
    date_from: date
    date_to: date
    channels: list[ChannelFunnelRead]
