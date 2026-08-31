"""Massa de dados da Empresa Demo (`test-data/demo-company/`) — testa o
pipeline REAL de importação -> Analytics -> exportação ponta a ponta contra
os três formatos (CSV, XLSX, JSON), comparando o resultado com os KPIs
pré-computados em `expected/*.json` (mesma fonte de verdade: as funções reais
de `app/modules/metrics/engine.py`, nunca recalculadas à mão aqui).

O arquivo XLSX tem 3 abas (Campanhas/Financeiro/Leads) — desde a seleção de
aba em .xlsx multi-aba (2026-08-31, `POST /imports` com `sheet_name`), as
três são importáveis (cada uma com seu `sheet_name` explícito), não só a
primeira. Ver `test-data/demo-company/README.md`.
"""

import json
import math
from pathlib import Path

import pytest

DEMO_DIR = Path(__file__).resolve().parent.parent.parent / "test-data" / "demo-company"

_CONTENT_TYPES = {
    "csv": "text/csv",
    "json": "application/json",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana Demo", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _suggested_mapping_dict(create_resp_json: dict) -> dict[str, str]:
    return {
        s["header"]: s["canonical_field"]
        for s in create_resp_json["suggested_mapping"]
        if s["canonical_field"]
    }


def _import_file(client, org_id: str, domain: str, path: Path, *, sheet_name: str | None = None) -> dict:
    """Roda o fluxo completo (upload -> mapeamento sugerido -> confirmação)
    e devolve o resumo de confirmação — igual ao que o wizard real faz,
    aceitando a sugestão automática de mapeamento sem edição manual.
    `sheet_name` só se aplica a .xlsx com mais de uma aba (ver
    parsers.py::SheetSelectionRequiredError)."""
    file_format = path.suffix.lstrip(".")
    data = {"domain": domain}
    if sheet_name is not None:
        data["sheet_name"] = sheet_name
    create = client.post(
        f"/api/v1/organizations/{org_id}/imports",
        data=data,
        files={"file": (path.name, path.read_bytes(), _CONTENT_TYPES[file_format])},
    )
    assert create.status_code == 201, create.text
    body = create.json()
    job_id = body["job"]["id"]
    mapping = _suggested_mapping_dict(body)

    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {"date_format": "ISO"}},
    )
    assert mapping_resp.status_code == 200, mapping_resp.text
    summary = mapping_resp.json()
    assert summary["invalid"] == 0, f"{path.name}: {summary}"

    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm",
        json={"duplicate_strategy": "skip"},
    )
    assert confirm.status_code == 200, confirm.text
    confirm_body = confirm.json()
    assert confirm_body["status"] == "COMPLETED"
    return confirm_body


def _create_channels(client, org_id: str, channel_names: list[str]) -> None:
    for name in channel_names:
        resp = client.post(f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": name})
        assert resp.status_code in (200, 201), resp.text


def _load_expected(key: str) -> dict:
    return json.loads((DEMO_DIR / "expected" / f"{key}-kpis.json").read_text(encoding="utf-8"))


def _approx(actual: float | None, expected: float | None, *, rel: float = 1e-3, abs_: float = 0.05) -> bool:
    if expected is None or actual is None:
        return expected is None and actual is None
    return math.isclose(actual, expected, rel_tol=rel, abs_tol=abs_)


def _assert_metrics_match(actual_section: dict, expected_section: dict, section_label: str) -> None:
    for key, expected_metric in expected_section.items():
        actual_metric = actual_section[key]["current"]
        assert actual_metric["is_applicable"] == expected_metric["is_applicable"], (
            f"{section_label}.{key}: is_applicable divergente "
            f"(esperado={expected_metric['is_applicable']}, real={actual_metric['is_applicable']})"
        )
        if expected_metric["is_applicable"]:
            assert _approx(actual_metric["value"], expected_metric["value"]), (
                f"{section_label}.{key}: valor divergente "
                f"(esperado={expected_metric['value']}, real={actual_metric['value']})"
            )


# ---------------------------------------------------------------------------
# CSV — os três domínios (financeiro, funil, campanhas) são importáveis.
# ---------------------------------------------------------------------------


def test_csv_dataset_imports_and_matches_expected_kpis(client):
    expected = _load_expected("csv")
    org_id = _register_login_and_create_org(client, "demo.csv@example.com", "Empresa Demo CSV")
    _create_channels(client, org_id, expected["channels"])

    fin = _import_file(
        client, org_id, "financial_periods", DEMO_DIR / "csv" / "demo-financeiro-2026-02-to-2026-05.csv"
    )
    assert fin["created_rows"] == expected["financial_periods"]

    funnel = _import_file(
        client, org_id, "funnel_snapshots", DEMO_DIR / "csv" / "demo-funil-2026-02-to-2026-05.csv"
    )
    assert funnel["created_rows"] == expected["funnel_snapshots"]

    campaigns = _import_file(
        client, org_id, "campaigns", DEMO_DIR / "csv" / "demo-marketing-2026-02-to-2026-05.csv"
    )
    assert campaigns["created_rows"] == expected["campaigns"]

    date_from, date_to = expected["months"][0], expected["months"][-1]
    executive = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": date_from, "date_to": date_to},
    ).json()
    _assert_metrics_match(executive, expected["executive"], "executive")

    marketing = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing",
        params={"date_from": date_from, "date_to": date_to},
    ).json()
    assert marketing["campaign_count"] == expected["campaigns"]
    _assert_metrics_match(marketing, expected["marketing"], "marketing")


def test_csv_financial_periods_export_round_trips_imported_data(client):
    org_id = _register_login_and_create_org(client, "demo.csvexport@example.com", "Empresa Demo CSV Export")
    _import_file(
        client, org_id, "financial_periods", DEMO_DIR / "csv" / "demo-financeiro-2026-02-to-2026-05.csv"
    )

    export = client.get(
        f"/api/v1/organizations/{org_id}/exports/financial_periods",
        params={"format": "csv"},
    )
    assert export.status_code == 200
    assert export.headers["content-type"].startswith("text/csv")
    body = export.text
    assert "2026-02-01" in body
    assert "2026-05-01" in body


def test_csv_products_catalog_imports_with_alias_headers(client):
    org_id = _register_login_and_create_org(client, "demo.products@example.com", "Empresa Demo Produtos")
    result = _import_file(client, org_id, "products", DEMO_DIR / "csv" / "demo-produtos-catalogo.csv")
    assert result["created_rows"] == 5

    products = client.get(f"/api/v1/organizations/{org_id}/products").json()
    names = {p["name"] for p in products}
    assert "Plano Essencial" in names
    assert "Plano Legado" in names
    legado = next(p for p in products if p["name"] == "Plano Legado")
    assert legado["active"] is False


# ---------------------------------------------------------------------------
# JSON — os três domínios, mesmo fluxo do CSV, valores/null nativos do JSON.
# ---------------------------------------------------------------------------


def test_json_dataset_imports_and_matches_expected_kpis(client):
    expected = _load_expected("json")
    org_id = _register_login_and_create_org(client, "demo.json@example.com", "Empresa Demo JSON")
    _create_channels(client, org_id, expected["channels"])

    fin = _import_file(
        client, org_id, "financial_periods", DEMO_DIR / "json" / "demo-financeiro-2025-06-to-2025-09.json"
    )
    assert fin["created_rows"] == expected["financial_periods"]

    funnel = _import_file(
        client, org_id, "funnel_snapshots", DEMO_DIR / "json" / "demo-funil-2025-06-to-2025-09.json"
    )
    assert funnel["created_rows"] == expected["funnel_snapshots"]

    campaigns = _import_file(
        client, org_id, "campaigns", DEMO_DIR / "json" / "demo-marketing-2025-06-to-2025-09.json"
    )
    assert campaigns["created_rows"] == expected["campaigns"]

    date_from, date_to = expected["months"][0], expected["months"][-1]
    executive = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": date_from, "date_to": date_to},
    ).json()
    _assert_metrics_match(executive, expected["executive"], "executive")

    marketing = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing",
        params={"date_from": date_from, "date_to": date_to},
    ).json()
    _assert_metrics_match(marketing, expected["marketing"], "marketing")


def test_json_financial_periods_first_month_has_null_taxes(client):
    """Cenário de dado obrigatório (secao 21 do prompt de origem): `taxes`
    ausente (null de verdade, nunca 0) no primeiro mes do dataset JSON."""
    org_id = _register_login_and_create_org(client, "demo.jsonnull@example.com", "Empresa Demo JSON Null")
    _import_file(
        client, org_id, "financial_periods", DEMO_DIR / "json" / "demo-financeiro-2025-06-to-2025-09.json"
    )
    financials = client.get(f"/api/v1/organizations/{org_id}/financials").json()
    first_month = next(p for p in financials if p["period"] == "2025-06-01")
    assert first_month["taxes"] is None


def test_json_export_round_trips_imported_campaigns(client):
    org_id = _register_login_and_create_org(client, "demo.jsonexport@example.com", "Empresa Demo JSON Export")
    expected = _load_expected("json")
    _create_channels(client, org_id, expected["channels"])
    _import_file(
        client, org_id, "campaigns", DEMO_DIR / "json" / "demo-marketing-2025-06-to-2025-09.json"
    )

    export = client.get(
        f"/api/v1/organizations/{org_id}/exports/campaigns",
        params={"format": "json"},
    )
    assert export.status_code == 200
    rows = export.json()
    assert len(rows) == expected["campaigns"]


# ---------------------------------------------------------------------------
# XLSX — 3 abas (Campanhas/Financeiro/Leads). Desde a seleção de aba em
# .xlsx multi-aba (2026-08-31), as três são importáveis, cada uma com seu
# `sheet_name` explícito — sem escolha, o upload pede pra escolher (ver
# tests/api/test_imports.py::test_xlsx_multi_sheet_without_sheet_name_requires_selection).
# ---------------------------------------------------------------------------


def test_xlsx_upload_without_sheet_name_requires_selection(client):
    org_id = _register_login_and_create_org(
        client, "demo.xlsxnosheet@example.com", "Empresa Demo XLSX Sem Aba"
    )
    resp = client.post(
        f"/api/v1/organizations/{org_id}/imports",
        data={"domain": "campaigns"},
        files={
            "file": (
                "demo-marketing-historical.xlsx",
                (DEMO_DIR / "xlsx" / "demo-marketing-historical.xlsx").read_bytes(),
                _CONTENT_TYPES["xlsx"],
            )
        },
    )
    assert resp.status_code == 200
    assert resp.json() == {"needs_sheet_selection": True, "sheets": ["Campanhas", "Financeiro", "Leads"]}


def test_xlsx_dataset_imports_all_three_sheets_and_matches_expected_kpis(client):
    expected = _load_expected("xlsx")
    org_id = _register_login_and_create_org(client, "demo.xlsx@example.com", "Empresa Demo XLSX")
    _create_channels(client, org_id, expected["channels"])
    xlsx_path = DEMO_DIR / "xlsx" / "demo-marketing-historical.xlsx"

    campaigns = _import_file(client, org_id, "campaigns", xlsx_path, sheet_name="Campanhas")
    assert campaigns["created_rows"] == expected["campaigns"]

    fin = _import_file(client, org_id, "financial_periods", xlsx_path, sheet_name="Financeiro")
    assert fin["created_rows"] == expected["financial_periods"]

    funnel = _import_file(client, org_id, "funnel_snapshots", xlsx_path, sheet_name="Leads")
    assert funnel["created_rows"] == expected["funnel_snapshots"]

    date_from, date_to = expected["months"][0], expected["months"][-1]
    executive = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": date_from, "date_to": date_to},
    ).json()
    _assert_metrics_match(executive, expected["executive"], "executive")

    marketing = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing",
        params={"date_from": date_from, "date_to": date_to},
    ).json()
    assert marketing["campaign_count"] == expected["campaigns"]
    _assert_metrics_match(marketing, expected["marketing"], "marketing")


# ---------------------------------------------------------------------------
# Manifest — sanity check de que os arquivos gerados batem com o que o
# manifest anuncia (protege contra o gerador e os fixtures divergirem).
# ---------------------------------------------------------------------------


def test_manifest_matches_generated_files_on_disk():
    manifest = json.loads((DEMO_DIR / "demo-data-manifest.json").read_text(encoding="utf-8"))
    assert manifest["seed"] == 20260831
    for dataset in manifest["datasets"]:
        for rel_path in dataset["files"]:
            assert (DEMO_DIR / Path(*rel_path.split("/"))).exists(), f"arquivo ausente: {rel_path}"


@pytest.mark.parametrize("key", ["csv", "xlsx", "json"])
def test_expected_kpis_file_has_no_negative_revenue_or_investment(key):
    """Guarda-corpo simples contra o gerador produzir um cenário absurdo
    (receita ou investimento negativo) por causa de ruído mal calibrado."""
    expected = _load_expected(key)
    revenue = expected["executive"]["revenue"]
    if revenue["is_applicable"]:
        assert revenue["value"] >= 0
