"""Relatório em PDF do Relatório Básico (RF-026) — PR4 (adoção do padrão de
PDF server-side em outras telas, ver docs/reports/PR4_INVENTARIO.md). Puro
(sem banco/FastAPI, mesmo espírito de `funnel_pdf.py`): recebe os dados já
calculados pelo router (as mesmas funções que alimentam `/reports/basic` e
`/analytics/marketing` — `compute_dashboard_metrics`, `compare_periods`,
`compute_marketing_metrics` — nenhuma consulta nem regra de negócio nova
aqui) e devolve os bytes do PDF.

3 seções (capa/rodapé ficam com `pdf_builder.build_pdf`): KPIs do Período,
Comparação com o Baseline, Marketing do Período — a última omitida por
completo quando não há nenhuma campanha no período (mesmo critério de
honestidade das seções de canal do Funil, RN-003, e do aviso já existente
na tela — `noCampaignsThisPeriod`).
"""

from datetime import date, datetime

from app.core.formatting import format_decimal, format_percentage
from app.modules.metrics.engine import MetricResult, PeriodComparison
from app.modules.reports import pdf_builder

# (chave em `dashboard`/`marketing`, rótulo pt-BR, é percentual?)
_DASHBOARD_ROWS: list[tuple[str, str, bool]] = [
    ("revenue", "Receita", False),
    ("profit", "Lucro", False),
    ("margin", "Margem", True),
    ("cac", "CAC", False),
    ("conversion_rate", "Taxa de Conversão", True),
    ("average_ticket", "Ticket Médio", False),
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


def _format_metric(metric: MetricResult, *, percent: bool) -> str:
    if not metric.is_applicable or metric.value is None:
        return _NOT_APPLICABLE
    return format_percentage(metric.value) if percent else format_decimal(metric.value)


def _format_optional(value: float | None, *, percent: bool = False, signed: bool = False) -> str:
    if value is None:
        return _NOT_APPLICABLE
    return format_percentage(value, signed=signed) if percent else format_decimal(value)


def build_basic_report(
    *,
    organization_name: str,
    period: date,
    generated_at: datetime,
    dashboard: dict[str, MetricResult],
    revenue_vs_baseline: PeriodComparison | None,
    profit_vs_baseline: PeriodComparison | None,
    marketing: dict[str, MetricResult] | None,
    campaign_count: int,
) -> bytes:
    sections = []

    # KPIs do Dashboard — mesmos 6 de `DASHBOARD_ROWS` em reports/page.tsx
    # (sem recurrence_rate, que o /reports/basic já não inclui).
    sections.append(pdf_builder.section_title("KPIs do Período"))
    dashboard_rows = [
        (label, _format_metric(dashboard[key], percent=percent)) for key, label, percent in _DASHBOARD_ROWS
    ]
    sections.append(pdf_builder.kpi_table(dashboard_rows))

    # Comparação com o baseline — mesmo dado de PeriodComparisonRead, agora
    # numa tabela com baseline/atual/variação (mesma informação mostrada em
    # reports/page.tsx, "R$X → R$Y (variação%)").
    sections.append(pdf_builder.section_title("Comparação com o Baseline"))
    if revenue_vs_baseline is None or profit_vs_baseline is None:
        sections.append(pdf_builder.paragraph("Organização ainda não possui baseline registrado."))
    else:
        baseline_rows = [
            (
                label,
                _format_optional(comparison.baseline_value),
                _format_optional(comparison.current_value),
                _format_optional(comparison.percent_change, percent=True, signed=True),
            )
            for label, comparison in (("Receita", revenue_vs_baseline), ("Lucro", profit_vs_baseline))
        ]
        sections.append(pdf_builder.data_table(["Métrica", "Baseline", "Atual", "Variação"], baseline_rows))

    # Marketing do período — omitido por completo sem campanha no período
    # (RN-003: nunca uma seção vazia, mesmo critério das seções de canal do
    # Funil na PR3 e do aviso já existente em reports/page.tsx).
    if marketing is not None and campaign_count > 0:
        sections.append(pdf_builder.section_title("Marketing do Período"))
        marketing_rows = [
            (label, _format_metric(marketing[key], percent=percent))
            for key, label, percent in _MARKETING_ROWS
        ]
        sections.append(pdf_builder.kpi_table(marketing_rows))

    return pdf_builder.build_pdf(
        sections,
        title="Relatório Básico",
        subtitle=f"{organization_name} — {period.strftime('%m/%Y')}",
        organization_name=organization_name,
        generated_at=generated_at,
    )
