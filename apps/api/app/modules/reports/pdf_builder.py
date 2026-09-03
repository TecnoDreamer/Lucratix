"""Infraestrutura generica de relatorio em PDF (ReportLab, server-side) —
RF do prompt de funil/graficos/PDF, secao "relatorio em PDF reutilizavel".

Blocos de apresentacao puros, sem nenhuma regra de negocio: qualquer
relatorio futuro (a PR4 inventaria onde mais faz sentido) monta sua lista
de secoes com as funcoes daqui e chama `build_pdf`. Nada neste arquivo
conhece Funil, canal, conversao etc. — isso fica em `funnel_pdf.py`.

Decisao de biblioteca (ReportLab, nao WeasyPrint): ver pyproject.toml e
docs/reports/PDF_INFRAESTRUTURA.md — ReportLab e pip-instalavel sem
nenhuma biblioteca de sistema, mesmo criterio ja usado para escolher
openpyxl no lugar de pandas. A fonte padrao (Helvetica) foi verificada
manualmente e renderiza acentuacao pt-BR corretamente (nenhuma fonte TTF
customizada precisou ser embutida).
"""

from collections.abc import Sequence
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    Flowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Mesma cor de marca usada na UI (azul, ver components/insights-panel.tsx/
# tailwind.config) — para o relatorio nao parecer um documento generico
# desconectado do produto.
BRAND_BLUE = colors.HexColor("#2563eb")
TEXT_SLATE = colors.HexColor("#334155")
MUTED_SLATE = colors.HexColor("#64748b")
BORDER_SLATE = colors.HexColor("#e2e8f0")

_STYLES = getSampleStyleSheet()

TITLE_STYLE = ParagraphStyle(
    "ReportTitle", parent=_STYLES["Title"], textColor=BRAND_BLUE, fontSize=18, spaceAfter=4
)
SUBTITLE_STYLE = ParagraphStyle(
    "ReportSubtitle", parent=_STYLES["Normal"], textColor=MUTED_SLATE, fontSize=10, spaceAfter=12
)
SECTION_TITLE_STYLE = ParagraphStyle(
    "SectionTitle",
    parent=_STYLES["Heading2"],
    textColor=BRAND_BLUE,
    fontSize=13,
    spaceBefore=14,
    spaceAfter=6,
)
BODY_STYLE = ParagraphStyle(
    "ReportBody", parent=_STYLES["Normal"], textColor=TEXT_SLATE, fontSize=10, leading=14
)
NOTE_STYLE = ParagraphStyle(
    "ReportNote", parent=_STYLES["Normal"], textColor=MUTED_SLATE, fontSize=8, leading=11
)


def section_title(text: str) -> Flowable:
    return Paragraph(text, SECTION_TITLE_STYLE)


def paragraph(text: str) -> Flowable:
    return Paragraph(text, BODY_STYLE)


def note(text: str) -> Flowable:
    return Paragraph(text, NOTE_STYLE)


def spacer(height: float = 0.3) -> Flowable:
    return Spacer(1, height * cm)


def kpi_table(
    rows: Sequence[tuple[str, str]], *, col_widths: tuple[float, float] | None = None
) -> Flowable:
    """Tabela simples de 2 colunas (rotulo, valor) — o caso mais comum de
    relatorio (uma etapa/metrica por linha). Para tabelas com mais colunas
    (ex.: conversao por etapa, com varias metricas), use `data_table`."""
    return data_table([], rows, col_widths=col_widths, show_header=False)


def data_table(
    header: Sequence[str],
    rows: Sequence[tuple[str, ...]],
    *,
    col_widths: tuple[float, ...] | None = None,
    highlight_row: int | None = None,
    show_header: bool = True,
) -> Flowable:
    """Tabela de dados generica — cabecalho opcional, linha destacavel (ex.:
    o "gargalo" na conversao por etapa). `highlight_row` e o indice na lista
    `rows` (0-based), nunca inclui o cabecalho na contagem."""
    data: list[list[str]] = ([list(header)] if show_header else []) + [list(r) for r in rows]

    style_commands = [
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_SLATE),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_SLATE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if show_header:
        style_commands += [
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    if highlight_row is not None:
        table_row = highlight_row + (1 if show_header else 0)
        style_commands.append(("BACKGROUND", (0, table_row), (-1, table_row), colors.HexColor("#fef3c7")))

    table = Table(
        data, colWidths=list(col_widths) if col_widths else None, repeatRows=1 if show_header else 0
    )
    table.setStyle(TableStyle(style_commands))
    return table


def build_pdf(
    sections: list[Flowable],
    *,
    title: str,
    subtitle: str,
    organization_name: str,
    generated_at: datetime,
) -> bytes:
    """Monta o documento final: cabecalho (titulo + organizacao + intervalo)
    no topo da primeira pagina, rodape com "Gerado por Lucratix" + data +
    numero de pagina em TODAS as paginas (RN: dado exclusivo desta
    organizacao, nunca deixar a pagina sem identificacao de origem/quando)."""

    def _footer(canvas: Canvas, doc: SimpleDocTemplate) -> None:
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED_SLATE)
        footer_text = (
            f"Gerado por Lucratix em {generated_at.strftime('%d/%m/%Y %H:%M')} "
            f"— dado exclusivo de {organization_name}, nao compartilhar fora da organizacao."
        )
        canvas.drawString(2 * cm, 1.2 * cm, footer_text)
        canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Pagina {doc.page}")
        canvas.restoreState()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.2 * cm,
        title=title,
    )

    flowables: list[Flowable] = [
        Paragraph(title, TITLE_STYLE),
        Paragraph(subtitle, SUBTITLE_STYLE),
        *sections,
    ]
    doc.build(flowables, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()
