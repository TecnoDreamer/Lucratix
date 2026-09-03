"""Relatorio em PDF do Funil — RF do prompt de funil/graficos/PDF. Puro
(sem banco/FastAPI, mesmo espirito de `analytics/funnel_analytics.py`):
recebe os dados ja calculados pelo router (as mesmas funcoes que
alimentam `/analytics/funnel`/`/series`/`/by-channel`, nenhuma consulta
nem regra de negocio nova aqui) e devolve os bytes do PDF.

11 secoes (estrutura propria, o prompt original nao especificava os
titulos literalmente): capa/cabecalho (`pdf_builder.build_pdf`), sumario
executivo, visao geral das etapas, conversao/abandono por etapa,
comparacao com periodo anterior, evolucao mensal, segmentacao por canal,
comparacao entre canais, observacoes deterministicas, definicoes,
rodape/paginacao (`pdf_builder.build_pdf`). As secoes de canal (7/8) sao
omitidas por completo — nunca aparecem vazias — quando nao ha nenhum
canal com dado no periodo (mesmo criterio de `FunnelByChannelTable` na
tela).
"""

from dataclasses import dataclass
from datetime import date, datetime

from app.core.formatting import format_integer, format_percentage
from app.modules.analytics.funnel_analytics import (
    FUNNEL_STAGES,
    STAGE_LABELS_PT_BR,
    StageConversion,
    describe_biggest_mover,
    describe_bottleneck,
    find_bottleneck,
)
from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult
from app.modules.reports import pdf_builder

_DEFINITIONS: list[tuple[str, str]] = [
    ("Funil", "Sequência de 8 etapas, do primeiro contato (Impressões) até a Recompra."),
    ("Taxa de Conversão", "Percentual que avançou de uma etapa para a seguinte."),
    ("Taxa de Abandono", "Complemento da conversão — 1 − Taxa de Conversão da etapa."),
    (
        "MQL / SQL",
        "Qualificação de lead pelo marketing/vendas — sempre informada manualmente, "
        "sem regra automática neste sistema.",
    ),
    ("Canal", "Categoria de origem do tráfego/lead (ex.: Busca Paga, E-mail Marketing)."),
]


@dataclass(frozen=True)
class ChannelReportData:
    channel_name: str
    stages: dict[str, MetricResult]
    conversions: list[StageConversion]


def _format_metric(metric: MetricResult, *, percent: bool = False) -> str:
    if not metric.is_applicable or metric.value is None:
        return "Não aplicável"
    return format_percentage(metric.value) if percent else format_integer(metric.value)


def _transition_label(conversion: StageConversion) -> str:
    return f"{STAGE_LABELS_PT_BR[conversion.from_stage]} → {STAGE_LABELS_PT_BR[conversion.to_stage]}"


def build_funnel_report(
    *,
    organization_name: str,
    date_from: date,
    date_to: date,
    generated_at: datetime,
    current_stages: dict[str, MetricResult],
    current_conversions: list[StageConversion],
    previous_conversions: list[StageConversion],
    monthly_series: list[tuple[date, dict[str, MetricResult]]],
    channels: list[ChannelReportData],
) -> bytes:
    sections = []

    # 2. Sumario executivo — curto, "a impressao geral" (as mesmas 2
    # observacoes do InsightsPanel da tela, combinadas em um paragrafo).
    sections.append(pdf_builder.section_title("Sumário Executivo"))
    bottleneck_text = describe_bottleneck(current_conversions)
    mover_text = describe_biggest_mover(current_conversions, previous_conversions)
    summary = " ".join(t for t in (bottleneck_text, mover_text) if t)
    sections.append(
        pdf_builder.paragraph(summary or "Dados insuficientes no período para gerar um sumário executivo.")
    )

    # 3. Visao geral das etapas.
    sections.append(pdf_builder.section_title("Visão Geral das Etapas"))
    stage_rows = [
        (STAGE_LABELS_PT_BR[stage], _format_metric(current_stages[stage])) for stage in FUNNEL_STAGES
    ]
    sections.append(pdf_builder.kpi_table(stage_rows))

    # 4. Conversao e abandono por etapa, com o gargalo destacado.
    sections.append(pdf_builder.section_title("Conversão e Abandono por Etapa"))
    bottleneck = find_bottleneck(current_conversions)
    highlight_row = current_conversions.index(bottleneck) if bottleneck is not None else None
    conversion_rows = [
        (
            _transition_label(c),
            _format_metric(c.conversion_rate, percent=True),
            _format_metric(c.drop_off_rate, percent=True),
        )
        for c in current_conversions
    ]
    sections.append(
        pdf_builder.data_table(
            ["Transição", "Conversão", "Abandono"], conversion_rows, highlight_row=highlight_row
        )
    )

    # 5. Comparacao com o periodo anterior (so a taxa de conversao — o
    # mesmo criterio de /analytics/funnel: volume bruto nao e comparavel
    # isoladamente, a taxa e o KPI).
    sections.append(pdf_builder.section_title("Comparação com o Período Anterior"))
    comparison_rows = []
    for curr, prev in zip(current_conversions, previous_conversions, strict=True):
        comparison = engine.compare_periods(prev.conversion_rate.value, curr.conversion_rate.value)
        change_text = (
            "Não aplicável"
            if comparison.percent_change is None
            else format_percentage(comparison.percent_change, signed=True)
        )
        comparison_rows.append((_transition_label(curr), change_text))
    sections.append(pdf_builder.kpi_table(comparison_rows))

    # 6. Evolucao mensal — PDF e estatico, sem grafico interativo; tabela
    # mes a mes das 8 etapas (mesmo dado de /analytics/funnel/series).
    sections.append(pdf_builder.section_title("Evolução Mensal"))
    evolution_header = ["Mês", *[STAGE_LABELS_PT_BR[s] for s in FUNNEL_STAGES]]
    evolution_rows = [
        (period.strftime("%m/%Y"), *[_format_metric(stages[s]) for s in FUNNEL_STAGES])
        for period, stages in monthly_series
    ]
    sections.append(pdf_builder.data_table(evolution_header, evolution_rows))

    # 7/8. Segmentacao e comparacao por canal — omitidas por completo
    # quando nenhum canal tem dado no periodo (RN-003: nunca uma secao
    # vazia, mesmo criterio de FunnelByChannelTable na tela).
    if channels:
        sections.append(pdf_builder.section_title("Segmentação por Canal"))
        channel_rows = [
            (c.channel_name, _format_metric(c.stages["leads"]), _format_metric(c.stages["customers"]))
            for c in channels
        ]
        sections.append(pdf_builder.data_table(["Canal", "Leads", "Clientes"], channel_rows))

        sections.append(pdf_builder.section_title("Comparação entre Canais"))
        channel_bottleneck_rows = []
        for c in channels:
            channel_bottleneck = find_bottleneck(c.conversions)
            if channel_bottleneck is not None and channel_bottleneck.conversion_rate.value is not None:
                channel_bottleneck_rows.append(
                    (
                        c.channel_name,
                        _transition_label(channel_bottleneck),
                        _format_metric(channel_bottleneck.conversion_rate, percent=True),
                    )
                )
            else:
                channel_bottleneck_rows.append((c.channel_name, "Não aplicável", "Não aplicável"))
        sections.append(pdf_builder.data_table(["Canal", "Menor conversão", "Taxa"], channel_bottleneck_rows))

    # 9. Observacoes deterministicas — a lista completa (agregado + por
    # canal), nunca linguagem causal.
    sections.append(pdf_builder.section_title("Observações Determinísticas"))
    observations = [o for o in (bottleneck_text, mover_text) if o]
    for c in channels:
        channel_observation = describe_bottleneck(c.conversions)
        if channel_observation:
            observations.append(f"{c.channel_name}: {channel_observation}")
    if observations:
        for observation in observations:
            sections.append(pdf_builder.paragraph(f"• {observation}"))
    else:
        sections.append(pdf_builder.paragraph("Sem observações — dados insuficientes no período."))

    # 10. Definicoes — glossario condensado, texto proprio (nao importa do
    # catalogo do frontend, que vive em outro runtime).
    sections.append(pdf_builder.section_title("Definições"))
    sections.append(pdf_builder.data_table(["Termo", "Definição"], _DEFINITIONS))
    sections.append(pdf_builder.note("Definições completas disponíveis no Glossário da plataforma."))

    # 1 (capa/cabecalho) e 11 (rodape/paginacao) sao responsabilidade do
    # build_pdf generico, nao desta funcao.
    return pdf_builder.build_pdf(
        sections,
        title="Relatório do Funil",
        subtitle=f"{organization_name} — {date_from.strftime('%d/%m/%Y')} a {date_to.strftime('%d/%m/%Y')}",
        organization_name=organization_name,
        generated_at=generated_at,
    )
