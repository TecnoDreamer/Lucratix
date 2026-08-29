"""Exportação de dados — corte vertical, domínio Financeiro (2026-08-29).
Mesmo nível de permissão de GET /financials (qualquer membership ativa,
inclusive VIEWER) — exportar é ler o mesmo dado que já aparece na tela."""

import csv
import io
import json

import openpyxl


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _register_and_login(client, name: str, email: str, password: str = "SenhaForte123!") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": password})
    client.post("/api/v1/auth/login", json={"email": email, "password": password})


def _seed_financial_periods(client, org_id: str) -> None:
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-01-01", "revenue": 10000, "costs": 3000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-02-01", "revenue": 12000, "costs": 3500},
    )


def test_export_csv_contains_seeded_periods(client):
    org_id = _register_login_and_create_org(client, "exp.csv@example.com", "Empresa Exp CSV")
    _seed_financial_periods(client, org_id)

    resp = client.get(f"/api/v1/organizations/{org_id}/exports/financial_periods", params={"format": "csv"})
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert 'attachment; filename="financial_periods_export.csv"' in resp.headers["content-disposition"]

    rows = list(csv.DictReader(io.StringIO(resp.content.decode("utf-8-sig"))))
    assert len(rows) == 2
    assert rows[0]["Período"] == "2026-01-01"
    assert rows[0]["Receita"] == "10000.0"


def test_export_xlsx_is_a_valid_workbook(client):
    org_id = _register_login_and_create_org(client, "exp.xlsx@example.com", "Empresa Exp Xlsx")
    _seed_financial_periods(client, org_id)

    resp = client.get(f"/api/v1/organizations/{org_id}/exports/financial_periods", params={"format": "xlsx"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    wb = openpyxl.load_workbook(io.BytesIO(resp.content))
    sheet = wb.active
    assert sheet.max_row == 3  # cabecalho + 2 linhas
    assert sheet.cell(row=1, column=1).value == "Período"


def test_export_json_uses_canonical_keys_and_is_reimportable_shape(client):
    org_id = _register_login_and_create_org(client, "exp.json@example.com", "Empresa Exp Json")
    _seed_financial_periods(client, org_id)

    resp = client.get(f"/api/v1/organizations/{org_id}/exports/financial_periods", params={"format": "json"})
    assert resp.status_code == 200
    payload = json.loads(resp.content)
    assert payload[0]["period"] == "2026-01-01"
    assert payload[0]["revenue"] == 10000.0


def test_export_filters_by_date_range(client):
    org_id = _register_login_and_create_org(client, "exp.range@example.com", "Empresa Exp Range")
    _seed_financial_periods(client, org_id)

    resp = client.get(
        f"/api/v1/organizations/{org_id}/exports/financial_periods",
        params={"format": "json", "date_from": "2026-02-01", "date_to": "2026-02-28"},
    )
    payload = json.loads(resp.content)
    assert len(payload) == 1
    assert payload[0]["period"] == "2026-02-01"
    assert (
        'filename="financial_periods_2026-02-01_2026-02-28.json"' in resp.headers["content-disposition"]
    )


def test_export_empty_organization_returns_empty_list(client):
    org_id = _register_login_and_create_org(client, "exp.empty@example.com", "Empresa Exp Empty")
    resp = client.get(f"/api/v1/organizations/{org_id}/exports/financial_periods", params={"format": "json"})
    assert resp.status_code == 200
    assert json.loads(resp.content) == []


def test_export_unsupported_domain_is_rejected(client):
    org_id = _register_login_and_create_org(client, "exp.baddomain@example.com", "Empresa Exp Bad Domain")
    resp = client.get(f"/api/v1/organizations/{org_id}/exports/leads", params={"format": "csv"})
    assert resp.status_code == 400


def test_export_unsupported_format_is_rejected(client):
    org_id = _register_login_and_create_org(client, "exp.badformat@example.com", "Empresa Exp Bad Format")
    resp = client.get(
        f"/api/v1/organizations/{org_id}/exports/financial_periods", params={"format": "pdf"}
    )
    assert resp.status_code == 422  # Literal invalido -> validacao do FastAPI


def test_viewer_can_export_same_as_dashboard_read(client_factory):
    owner = client_factory()
    viewer_client = client_factory()
    _register_and_login(owner, "Ana", "exp.viewerowner@example.com")
    _register_and_login(viewer_client, "Vitor", "exp.viewer@example.com")

    org_id = owner.post("/api/v1/organizations", json={"name": "Empresa Exp Viewer"}).json()["id"]
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "exp.viewer@example.com", "role": "VIEWER"},
    )
    _seed_financial_periods(owner, org_id)

    resp = viewer_client.get(
        f"/api/v1/organizations/{org_id}/exports/financial_periods", params={"format": "csv"}
    )
    assert resp.status_code == 200
