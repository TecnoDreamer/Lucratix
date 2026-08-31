"""Gerador determinístico da massa de dados da Empresa Demo (prompt de
monetização/BI/dados demo, 2026-08-31) — CSV, XLSX, JSON pra testar o
pipeline completo de importação, Analytics e exportação.

Os KPIs esperados (`expected/*.json`) são computados pelas MESMAS funções
reais do produto (`app.modules.metrics.engine`), nunca reimplementadas à
parte — evita "esperado" e "real" divergirem por um engano de fórmula
neste script.

Uso (da raiz do repo):
    PYTHONPATH=apps/api python test-data/demo-company/generate_demo_data.py

Determinístico: seed fixa (20260831, sugerida pelo prompt) — rodar de novo
produz os mesmos números (o único campo que muda é "generated_at" no
manifest). Ver README.md para o porquê de cada período/perfil escolhido.
"""

from __future__ import annotations

import csv
import hashlib
import json
import random
import sys
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
API_ROOT = ROOT.parents[1] / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

import openpyxl  # noqa: E402

from app.models.campaign import Campaign  # noqa: E402
from app.models.financial_period import FinancialPeriod  # noqa: E402
from app.models.funnel_snapshot import FunnelSnapshot  # noqa: E402
from app.modules.analytics.marketing_service import (  # noqa: E402
    aggregate_campaigns,
    compute_marketing_metrics,
)
from app.modules.analytics.service import (  # noqa: E402
    aggregate_financials,
    aggregate_funnels,
    compute_dashboard_metrics,
)

SEED = 20260831
RNG = random.Random(SEED)

CSV_DIR = ROOT / "csv"
XLSX_DIR = ROOT / "xlsx"
JSON_DIR = ROOT / "json"
EXPECTED_DIR = ROOT / "expected"


def noise(base: float, pct: float = 0.05) -> float:
    """Ruído limitado (±pct do valor), determinístico via RNG seedada —
    nunca `random.random()` fora da RNG seedada (RN da geração: reprodutível)."""
    return base * (1 + RNG.uniform(-pct, pct))


def month_range(start_year: int, start_month: int, count: int) -> list[date]:
    months = []
    y, m = start_year, start_month
    for _ in range(count):
        months.append(date(y, m, 1))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return months


# ---------------------------------------------------------------------------
# Perfis mensais — nunca o mesmo padrão nos três datasets (prompt, secao 14).
# Multiplicador aplicado sobre a base de receita/funil daquele mes.
# ---------------------------------------------------------------------------


@dataclass
class MonthProfile:
    period: date
    label: str
    multiplier: float


@dataclass
class Dataset:
    key: str  # "csv" | "xlsx" | "json"
    filename_period: str  # usado no nome de arquivo, ex "2026-02-to-2026-05"
    profile_name: str
    months: list[MonthProfile]
    channels: list[str]

    # Preenchido durante a geracao.
    financials: list[dict] = field(default_factory=list)
    funnels: list[dict] = field(default_factory=list)
    campaigns: list[dict] = field(default_factory=list)


CSV_DATASET = Dataset(
    key="csv",
    filename_period="2026-02-to-2026-05",
    profile_name="recuperacao_progressiva",
    months=[
        MonthProfile(p, label, mult)
        for p, label, mult in zip(
            month_range(2026, 2, 4),
            ["fraco", "medio", "bom", "transicao"],
            [0.70, 0.86, 1.00, 1.16],
            strict=True,
        )
    ],
    channels=["Google Ads", "Meta Ads", "Instagram", "Organico"],
)

XLSX_DATASET = Dataset(
    key="xlsx",
    # Secao 13 do prompt: pedido original ("jan a out/2025") colide com a
    # regra de 4 meses (secao 11). Resolvido explicitamente seguindo a
    # prioridade sugerida pelo proprio prompt ("se compativel com o
    # historico") — out/2025 a jan/2026 nao colide com nada (o seed.py da
    # Empresa Demo gera dado relativo a "hoje", nunca datas fixas passadas;
    # ver README.md, secao "Resolucao de periodos").
    filename_period="2025-10-to-2026-01",
    profile_name="bom_queda_recuperacao",
    months=[
        MonthProfile(p, label, mult)
        for p, label, mult in zip(
            month_range(2025, 10, 4),
            ["bom", "medio", "fraco", "transicao"],
            [1.14, 0.94, 0.66, 0.90],
            strict=True,
        )
    ],
    channels=["Google Ads", "LinkedIn", "Email", "Referral"],
)

JSON_DATASET = Dataset(
    key="json",
    filename_period="2025-06-to-2025-09",
    profile_name="pico_sazonalidade_desaceleracao",
    months=[
        MonthProfile(p, label, mult)
        for p, label, mult in zip(
            month_range(2025, 6, 4),
            ["bom", "medio", "medio", "fraco"],
            [1.32, 1.04, 0.88, 0.60],
            strict=True,
        )
    ],
    channels=["Google Ads", "Facebook", "Instagram", "Organico"],
)

DATASETS = [CSV_DATASET, XLSX_DATASET, JSON_DATASET]

# Base de receita/funil antes do multiplicador do mes — mesma ordem de
# grandeza da Empresa Demo ja seedada (app/seed.py), pra a demonstracao
# parecer parte da mesma historia de produto.
BASE_REVENUE = 45000.0
BASE_IMPRESSIONS = 130000.0


def _round2(value: float) -> float:
    return round(value, 2)


def generate_financials(dataset: Dataset) -> None:
    for i, m in enumerate(dataset.months):
        revenue = _round2(noise(BASE_REVENUE * m.multiplier))
        costs = _round2(revenue * noise(0.42, 0.06))
        expenses = _round2(revenue * noise(0.16, 0.06))
        marketing_investment = _round2(revenue * noise(0.14, 0.08))
        # "null valido" (prompt, secao 21): o primeiro mes de cada dataset
        # nao tem impostos lancados ainda (situacao real — regime tributario
        # apurado com atraso) — None, nunca 0 forcado.
        taxes = None if i == 0 else _round2(revenue * 0.06)

        dataset.financials.append(
            {
                "period": m.period,
                "revenue": revenue,
                "costs": costs,
                "expenses": expenses,
                "marketing_investment": marketing_investment,
                "taxes": taxes,
            }
        )


def generate_funnels(dataset: Dataset) -> None:
    for i, m in enumerate(dataset.months):
        impressions = round(noise(BASE_IMPRESSIONS * m.multiplier))
        visits = round(impressions * noise(0.065))
        leads = round(visits * noise(0.12))
        mqls = round(leads * noise(0.55))
        sqls = round(mqls * noise(0.5))
        opportunities = round(sqls * noise(0.72))
        customers = max(1, round(opportunities * noise(0.5)))
        # "0 valido" (prompt, secao 21): primeiro mes do dataset CSV — empresa
        # nova, ninguem teve chance de recomprar ainda. 0 de verdade, nao
        # ausencia de dado.
        if dataset.key == "csv" and i == 0:
            repeat_purchases = 0
        else:
            repeat_purchases = round(customers * noise(0.27))

        dataset.funnels.append(
            {
                "period": m.period,
                "impressions": impressions,
                "visits": visits,
                "leads": leads,
                # "null valido": dataset XLSX, segundo mes, MQL nao rastreado
                # naquele periodo (mudanca de ferramenta de automacao) —
                # None, omitido do arquivo, nunca 0.
                "mqls": None if (dataset.key == "xlsx" and i == 1) else mqls,
                "sqls": sqls,
                "opportunities": opportunities,
                "customers": customers,
                "repeat_purchases": repeat_purchases,
            }
        )


CAMPAIGN_NAME_TEMPLATES = {
    "Google Ads": "Busca - {season} ({period})",
    "Meta Ads": "Conversao - {season} ({period})",
    "Instagram": "Awareness - {season} ({period})",
    "Organico": "Conteudo - {season} ({period})",
    "LinkedIn": "ABM - {season} ({period})",
    "Email": "Nutricao - {season} ({period})",
    "Referral": "Indicacao - {season} ({period})",
    "Facebook": "Remarketing - {season} ({period})",
}


def _campaign_name(channel: str, month: MonthProfile) -> str:
    """Inclui o periodo (AAAA-MM) no nome — nao so o rotulo do mes ("bom",
    "medio"...) — porque dois meses do MESMO dataset podem ter o mesmo
    rotulo (ex.: dataset JSON tem "medio" duas vezes) e, com a rotacao de
    canal, cair no mesmo canal tambem: sem o periodo, isso gera uma colisao
    de chave natural real (channel, name) e o importador (corretamente)
    descarta uma das duas campanhas como duplicata."""
    return CAMPAIGN_NAME_TEMPLATES[channel].format(season=month.label, period=month.period.isoformat()[:7])


def generate_campaigns(dataset: Dataset) -> None:
    """2 campanhas por mes, canais alternando dentro da lista do dataset —
    cenarios obrigatorios (prompt, secao 21) distribuidos de proposito:
    a primeira campanha do mes "bom"/"transicao" e sempre alto ROAS: a do
    mes "fraco" e sempre baixo ROAS (as vezes abaixo de 1 — prejuizo real,
    nao so "menos bom")."""
    for i, m in enumerate(dataset.months):
        primary_channel = dataset.channels[i % len(dataset.channels)]
        secondary_channel = dataset.channels[(i + 1) % len(dataset.channels)]

        # Campanha "principal" do mes.
        investment_a = _round2(noise(BASE_REVENUE * m.multiplier * 0.09))
        impressions_a = round(noise(BASE_IMPRESSIONS * m.multiplier * 0.35))
        clicks_a = round(impressions_a * noise(0.02))
        leads_a = round(clicks_a * noise(0.14))
        opportunities_a = round(leads_a * noise(0.4))
        customers_a = max(0, round(opportunities_a * noise(0.45)))
        # ROAS alto em mes bom/transicao, baixo (as vezes <1) em mes fraco.
        roas_target_a = 4.6 if m.label in ("bom", "transicao") else 0.55
        attributed_revenue_a = _round2(investment_a * noise(roas_target_a, 0.1))

        dataset.campaigns.append(
            {
                "channel": primary_channel,
                "name": _campaign_name(primary_channel, m),
                "start_date": m.period,
                "end_date": date(
                    m.period.year, m.period.month, 28 if m.period.month == 2 else 30
                ),
                "investment": investment_a,
                "impressions": impressions_a,
                "clicks": clicks_a,
                "leads": leads_a,
                "opportunities": opportunities_a,
                "customers": customers_a,
                "attributed_revenue": attributed_revenue_a,
            }
        )

        # Segunda campanha do mes — sempre moderada (nem melhor nem pior
        # cenario extremo), canal diferente, ticket/CAC variando.
        investment_b = _round2(noise(BASE_REVENUE * m.multiplier * 0.045))
        impressions_b = round(noise(BASE_IMPRESSIONS * m.multiplier * 0.18))
        clicks_b = round(impressions_b * noise(0.028))
        leads_b = round(clicks_b * noise(0.18))
        opportunities_b = round(leads_b * noise(0.45))
        customers_b = max(0, round(opportunities_b * noise(0.5)))
        attributed_revenue_b = _round2(investment_b * noise(2.1, 0.15))

        dataset.campaigns.append(
            {
                "channel": secondary_channel,
                "name": _campaign_name(secondary_channel, m),
                "start_date": m.period,
                "end_date": date(
                    m.period.year, m.period.month, 28 if m.period.month == 2 else 30
                ),
                "investment": investment_b,
                "impressions": impressions_b,
                "clicks": clicks_b,
                "leads": leads_b,
                "opportunities": opportunities_b,
                "customers": customers_b,
                "attributed_revenue": attributed_revenue_b,
            }
        )


# ---------------------------------------------------------------------------
# Escrita dos arquivos — CSV/XLSX/JSON com o cabecalho canonico OU alias
# (prompt, secao 22: "alguns aliases intencionais para testar mapeamento").
# ---------------------------------------------------------------------------

FINANCIAL_HEADERS_CSV = {
    # canonical_name -> cabecalho usado no arquivo (mistura canonico e alias
    # de proposito, pra exercitar o motor de sugestao de mapeamento).
    "period": "Periodo",
    "revenue": "Faturamento",  # alias, nao "Receita"
    "costs": "Custo Total",  # alias, nao "Custos"
    "expenses": "Despesas",  # canonico
    "marketing_investment": "Investimento em marketing",  # canonico
    "taxes": "Impostos",  # canonico
}

FUNNEL_HEADERS_CSV = {
    "period": "Data de referencia",  # alias, nao "Periodo"
    "impressions": "Impressoes",
    "visits": "Sessoes",  # alias, nao "Visitas"
    "leads": "Leads",
    "mqls": "MQLs",
    "sqls": "SQLs",
    "opportunities": "Oportunidades",
    "customers": "Novos clientes",  # alias, nao "Clientes"
    "repeat_purchases": "Recompras",
}

CAMPAIGN_HEADERS = {
    "channel": "Canal de marketing",  # alias
    "name": "Nome da campanha",  # alias
    "start_date": "Data de inicio",
    "end_date": "Data de termino",
    "investment": "Investimento",
    "impressions": "Impressoes",
    "clicks": "Cliques",
    "leads": "Leads",
    "opportunities": "Oportunidades",
    "customers": "Vendas",  # alias, nao "Clientes"
    "attributed_revenue": "Receita atribuida",
}


def _fmt_date(d: date) -> str:
    return d.isoformat()


def _cell(value: object) -> object:
    if value is None:
        return ""
    if isinstance(value, date):
        return _fmt_date(value)
    return value


def write_csv(path: Path, headers: dict[str, str], rows: list[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(list(headers.values()))
        for row in rows:
            writer.writerow([_cell(row.get(k)) for k in headers])
    return len(rows)


def _json_cell(value: object) -> object:
    """Como `_cell`, mas preserva `None` como `null` de verdade — o
    importador de JSON trata ausencia como `null`/campo omitido, nunca
    como string vazia (isso e uma regra do CSV, onde nao existe tipo
    nativo pra ausencia)."""
    if value is None:
        return None
    if isinstance(value, date):
        return _fmt_date(value)
    return value


def write_json(path: Path, rows: list[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [{k: _json_cell(v) for k, v in row.items()} for row in rows]
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return len(rows)


def write_xlsx_multi_sheet(path: Path, sheets: dict[str, tuple[dict[str, str], list[dict]]]) -> None:
    """Sheet 1 e a UNICA que o importador real le hoje (workbook.worksheets[0]
    — ver apps/api/app/modules/imports/parsers.py::parse_xlsx). As demais
    ficam como referencia visual/futura (multi-sheet e um gap documentado em
    docs/data-import-export/ARCHITECTURE.md) — nunca apresentadas como se
    fossem importadas automaticamente hoje."""
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook = openpyxl.Workbook()
    first = True
    for sheet_name, (headers, rows) in sheets.items():
        sheet = workbook.active if first else workbook.create_sheet()
        first = False
        sheet.title = sheet_name[:31]
        sheet.append(list(headers.values()))
        for row in rows:
            sheet.append([_cell(row.get(k)) for k in headers])
    workbook.save(path)


# ---------------------------------------------------------------------------
# KPIs esperados — computados pelas MESMAS funcoes reais do produto.
# ---------------------------------------------------------------------------


def _metric_result_to_dict(result) -> dict:
    return {"value": result.value, "is_applicable": result.is_applicable, "reason": result.reason}


def compute_expected_kpis(dataset: Dataset) -> dict:
    financial_models = [FinancialPeriod(**row) for row in dataset.financials]
    funnel_models = [FunnelSnapshot(**row) for row in dataset.funnels]
    campaign_models = [
        Campaign(
            channel_id=None,
            name=row["name"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            investment=row["investment"],
            impressions=row["impressions"],
            clicks=row["clicks"],
            leads=row["leads"],
            opportunities=row["opportunities"],
            customers=row["customers"],
            attributed_revenue=row["attributed_revenue"],
        )
        for row in dataset.campaigns
    ]

    aggregated_financials = aggregate_financials(financial_models)
    aggregated_funnels = aggregate_funnels(funnel_models)
    dashboard_metrics = compute_dashboard_metrics(aggregated_financials, aggregated_funnels)

    aggregated_campaigns = aggregate_campaigns(campaign_models)
    marketing_metrics = compute_marketing_metrics(aggregated_campaigns)

    return {
        "dataset": dataset.key,
        "profile": dataset.profile_name,
        "months": [m.period.isoformat() for m in dataset.months],
        "month_labels": {m.period.isoformat(): m.label for m in dataset.months},
        "financial_periods": len(dataset.financials),
        "funnel_snapshots": len(dataset.funnels),
        "campaigns": len(dataset.campaigns),
        "channels": dataset.channels,
        "executive": {key: _metric_result_to_dict(value) for key, value in dashboard_metrics.items()},
        "marketing": {key: _metric_result_to_dict(value) for key, value in marketing_metrics.items()},
    }


# ---------------------------------------------------------------------------
# Orquestracao
# ---------------------------------------------------------------------------


def build_dataset(dataset: Dataset) -> None:
    generate_financials(dataset)
    generate_funnels(dataset)
    generate_campaigns(dataset)
    _assert_no_natural_key_collisions(dataset)


def _assert_no_natural_key_collisions(dataset: Dataset) -> None:
    """Guarda-corpo: CAMPAIGNS tem chave natural composta (channel, name) no
    importador real (`domains.py`) — uma colisao aqui geraria menos
    campanhas persistidas do que as geradas, silenciosamente (o importador
    so pula, nao erra), o que já aconteceu uma vez neste gerador. Falhar
    alto e cedo em vez de deixar o teste de import descobrir depois."""
    seen: set[tuple[str, str]] = set()
    for row in dataset.campaigns:
        key = (row["channel"], row["name"])
        if key in seen:
            raise AssertionError(f"[{dataset.key}] chave natural de campanha duplicada: {key}")
        seen.add(key)


def write_csv_dataset(dataset: Dataset) -> list[Path]:
    paths = []
    p = CSV_DIR / f"demo-financeiro-{dataset.filename_period}.csv"
    write_csv(p, FINANCIAL_HEADERS_CSV, dataset.financials)
    paths.append(p)

    p = CSV_DIR / f"demo-funil-{dataset.filename_period}.csv"
    write_csv(p, FUNNEL_HEADERS_CSV, dataset.funnels)
    paths.append(p)

    p = CSV_DIR / f"demo-marketing-{dataset.filename_period}.csv"
    write_csv(p, CAMPAIGN_HEADERS, dataset.campaigns)
    paths.append(p)
    return paths


def write_json_dataset(dataset: Dataset) -> list[Path]:
    paths = []
    p = JSON_DIR / f"demo-financeiro-{dataset.filename_period}.json"
    write_json(p, dataset.financials)
    paths.append(p)

    p = JSON_DIR / f"demo-funil-{dataset.filename_period}.json"
    write_json(p, dataset.funnels)
    paths.append(p)

    p = JSON_DIR / f"demo-marketing-{dataset.filename_period}.json"
    write_json(p, dataset.campaigns)
    paths.append(p)
    return paths


def write_xlsx_dataset(dataset: Dataset) -> Path:
    p = XLSX_DIR / "demo-marketing-historical.xlsx"
    write_xlsx_multi_sheet(
        p,
        {
            "Campanhas": (CAMPAIGN_HEADERS, dataset.campaigns),
            "Financeiro": (FINANCIAL_HEADERS_CSV, dataset.financials),
            "Leads": (FUNNEL_HEADERS_CSV, dataset.funnels),
        },
    )
    return p


PRODUCTS_CATALOG = [
    {"name": "Plano Essencial", "category": "Assinatura", "price": 129.90, "cost": 38.00, "active": True},
    {"name": "Plano Pro", "category": "Assinatura", "price": 249.90, "cost": 62.00, "active": True},
    {"name": "Plano Enterprise", "category": "Assinatura", "price": 890.00, "cost": 210.00, "active": True},
    {"name": "Consultoria Avulsa", "category": "Servico", "price": 450.00, "cost": 120.00, "active": True},
    {"name": "Plano Legado", "category": "Assinatura", "price": 89.90, "cost": 30.00, "active": False},
]
PRODUCT_HEADERS_CSV = {
    "name": "Nome do produto",  # alias
    "category": "Categoria",
    "price": "Valor unitario",  # alias
    "cost": "Custo",
    "active": "Ativo",
}


def write_products_catalog() -> Path:
    p = CSV_DIR / "demo-produtos-catalogo.csv"
    write_csv(p, PRODUCT_HEADERS_CSV, PRODUCTS_CATALOG)
    return p


def sha256_of_files(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for p in sorted(paths, key=lambda x: str(x)):
        digest.update(p.read_bytes())
    return digest.hexdigest()


def write_manifest(all_paths: dict[str, list[Path]], expected: dict[str, dict]) -> None:
    manifest = {
        "schemaVersion": "1.0",
        "name": "Empresa Demo — massa de dados de importacao",
        "seed": SEED,
        "generated_at": datetime.now(UTC).isoformat(),
        "datasets": [],
    }
    for key, dataset in [("csv", CSV_DATASET), ("xlsx", XLSX_DATASET), ("json", JSON_DATASET)]:
        paths = all_paths[key]
        manifest["datasets"].append(
            {
                "key": key,
                "profile": dataset.profile_name,
                "period_from": dataset.months[0].period.isoformat(),
                "period_to": dataset.months[-1].period.isoformat(),
                "month_labels": [m.label for m in dataset.months],
                "channels": dataset.channels,
                "records": {
                    "financial_periods": len(dataset.financials),
                    "funnel_snapshots": len(dataset.funnels),
                    "campaigns": len(dataset.campaigns),
                },
                "files": [str(p.relative_to(ROOT)).replace("\\", "/") for p in paths],
                "sha256": sha256_of_files(paths),
            }
        )
    (ROOT / "demo-data-manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def main() -> None:
    for dataset in DATASETS:
        build_dataset(dataset)

    all_paths: dict[str, list[Path]] = {}
    expected: dict[str, dict] = {}

    all_paths["csv"] = write_csv_dataset(CSV_DATASET)
    all_paths["xlsx"] = [write_xlsx_dataset(XLSX_DATASET)]
    all_paths["json"] = write_json_dataset(JSON_DATASET)
    write_products_catalog()

    EXPECTED_DIR.mkdir(parents=True, exist_ok=True)
    for key, dataset in [("csv", CSV_DATASET), ("xlsx", XLSX_DATASET), ("json", JSON_DATASET)]:
        kpis = compute_expected_kpis(dataset)
        expected[key] = kpis
        (EXPECTED_DIR / f"{key}-kpis.json").write_text(
            json.dumps(kpis, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    write_manifest(all_paths, expected)

    print("Gerado com sucesso:")
    for paths in all_paths.values():
        for p in paths:
            print(f"  {p.relative_to(ROOT)}")
    print(f"  {(ROOT / 'demo-data-manifest.json').relative_to(ROOT)}")
    for expected_key in expected:
        print(f"  expected/{expected_key}-kpis.json")


if __name__ == "__main__":
    main()
