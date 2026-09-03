"""Relatório em PDF da Visão Executiva (Analytics) — backlog da PR4
(ver docs/reports/PR4_INVENTARIO.md, item "Analytics: adiado"). Puro (sem
banco/FastAPI, mesmo espírito de `funnel_pdf.py`/`basic_pdf.py`): recebe os
dados já calculados pelo router (as mesmas funções que alimentam
`/analytics/executive`, `/executive/series`, `/executive/targets`,
`/marketing` e `/marketing/by-channel` — nenhuma consulta nem regra de
negócio nova aqui) e devolve os bytes do PDF.

Deliberadamente fora do escopo (não reabrir sem confirmar com o usuário):
- Correlação (`/analytics/executive/correlation`) — não tem par de métrica
  padrão sensato para um PDF de seções fixas (o usuário escolhe X/Y na
  tela); incluir um par arbitrário seria inventar uma "métrica principal"
  que o produto nunca definiu.
- Funil — já tem relatório próprio (`funnel_pdf.py`, PR3); duplicar aqui
  seria o mesmo dado em dois lugares, sem necessidade.

5 seções (capa/rodapé ficam com `pdf_builder.build_pdf`): KPIs Executivos,
Evolução Mensal, Progresso de Metas, Marketing do Período, Marketing por
Canal — as 3 últimas omitidas por completo quando não há meta definida
(receita e lucro ambos sem meta) ou nenhuma campanha no período (RN-003:
nunca uma seção vazia, mesmo critério do Funil/Relatório Básico).
"""

from dataclasses import dataclass
from datetime import date, datetime

from app.core.formatting import format_decimal, format_percentage
from app.modules.metrics.engine import MetricResult, PeriodComparison, compare_periods
from app.modules.reports import pdf_builder

# (chave em `current_metrics`/`marketing`, rótulo pt-BR, é percentual?)
_EXECUTIVE_ROWS: list[tuple[str, str, bool]] = [
    ("revenue", "Receita", False),
    ("profit", "Lucro", False),
    ("margin", "Margem", True),
    ("cac", "CAC", False),
    ("conversion_rate", "Taxa de Conversão", True),
    ("average_ticket", "Ticket Médio", False),
    ("recurrence_rate", "Recorrência", True),
]

_MARKETING_ROWS: list[tuple[str, str, bool]] = [
    ("roas", "ROAS", False),
    ("roi", "ROI", True),
    ("ctr", "CTR", True),
    ("cpc", "CPC", False),
    ("cpm", "CPM", False),
    ("cpl", "CPL", False),
    ("cpa", "CPA", False),
]

_NOT_APPLICABLE = "Não aplicável"


@dataclass(frozen=True)
class ChannelMarketingReportData:
    """Métricas de marketing de um canal — não é `funnel_pdf.ChannelReportData`
    (que carrega etapas/conversões do funil, um domínio diferente)."""

    channel_name: str
    metrics: dict[str, MetricResult]


def _format_metric(metric: MetricResult, *, percent: bool) -> str:
    if not metric.is_applicable or metric.value is None:
        return _NOT_APPLICABLE
    return format_percentage(metric.value) if percent else format_decimal(metric.value)


def _format_comparison(comparison: PeriodComparison) -> str:
    if comparison.percent_change is None:
        return _NOT_APPLICABLE
    return format_percentage(comparison.percent_change, signed=True)


def build_executive_report(
    *,
    organization_name: str,
    date_from: date,
    date_to: date,
    generated_at: datetime,
    current_metrics: dict[str, MetricResult],
    previous_metrics: dict[str, MetricResult],
    monthly_series: list[tuple[date, dict[str, MetricResult]]],
    revenue_target_progress: MetricResult | None,
    profit_target_progress: MetricResult | None,
    marketing: dict[str, MetricResult] | None,
    campaign_count: int,
    channels: list[ChannelMarketingReportData],
) -> bytes:
    sections = []

    # KPIs Executivos — os mesmos 7 de /analytics/executive, com a variação
    # vs. periodo anterior ja calculada por compare_periods no router.
    sections.append(pdf_builder.section_title("KPIs Executivos"))
    kpi_rows = [
        (
            label,
            _format_metric(current_metrics[key], percent=percent),
            _format_comparison(compare_periods(previous_metrics[key].value, current_metrics[key].value)),
        )
        for key, label, percent in _EXECUTIVE_ROWS
    ]
    sections.append(
        pdf_builder.data_table(["Métrica", "Atual", "Variação vs. Período Anterior"], kpi_rows)
    )

    # Evolucao mensal — mesmo padrao de funnel_pdf.py (PDF e estatico, sem
    # grafico interativo; tabela mes a mes dos mesmos 7 KPIs de
    # /analytics/executive/series).
    sections.append(pdf_builder.section_title("Evolução Mensal"))
    evolution_header = ["Mês", *[label for _, label, _ in _EXECUTIVE_ROWS]]
    evolution_rows = [
        (
            period.strftime("%m/%Y"),
            *[_format_metric(metrics[key], percent=percent) for key, _, percent in _EXECUTIVE_ROWS],
        )
        for period, metrics in monthly_series
    ]
    sections.append(pdf_builder.data_table(evolution_header, evolution_rows))

    # Progresso de metas — so receita/lucro sao agregaveis no intervalo
    # inteiro (targets_service.py::aggregate_target_progress; as outras 5
    # metricas sao razoes, nunca somaveis mes a mes). Secao omitida por
    # completo quando nenhuma das duas tem meta definida.
    has_revenue_target = revenue_target_progress is not None and revenue_target_progress.is_applicable
    has_profit_target = profit_target_progress is not None and profit_target_progress.is_applicable
    if has_revenue_target or has_profit_target:
        sections.append(pdf_builder.section_title("Progresso de Metas"))
        target_rows = [
            (label, _format_metric(progress, percent=True) if progress is not None else _NOT_APPLICABLE)
            for label, progress in (("Receita", revenue_target_progress), ("Lucro", profit_target_progress))
        ]
        sections.append(pdf_builder.kpi_table(target_rows))

    # Marketing do periodo — omitido por completo sem campanha no periodo
    # (RN-003, mesmo criterio do Relatorio Basico/Funil).
    if marketing is not None and campaign_count > 0:
        sections.append(pdf_builder.section_title("Marketing do Período"))
        marketing_rows = [
            (label, _format_metric(marketing[key], percent=percent))
            for key, label, percent in _MARKETING_ROWS
        ]
        sections.append(pdf_builder.kpi_table(marketing_rows))

        # Marketing por canal — so junto da secao acima, e so quando ha pelo
        # menos um canal com campanha no periodo.
        if channels:
            sections.append(pdf_builder.section_title("Marketing por Canal"))
            channel_rows = [
                (c.channel_name, _format_metric(c.metrics["roas"], percent=False))
                for c in channels
            ]
            sections.append(pdf_builder.data_table(["Canal", "ROAS"], channel_rows))

    return pdf_builder.build_pdf(
        sections,
        title="Relatório Executivo",
        subtitle=f"{organization_name} — {date_from.strftime('%d/%m/%Y')} a {date_to.strftime('%d/%m/%Y')}",
        organization_name=organization_name,
        generated_at=generated_at,
    )
