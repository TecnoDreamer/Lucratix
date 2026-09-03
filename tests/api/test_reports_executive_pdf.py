"""Relatorio da Visao Executiva em PDF (/reports/executive/pdf) — server-side,
ReportLab. Backlog da PR4 (docs/reports/PR4_INVENTARIO.md)."""

import io

from pypdf import PdfReader


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


def _extract_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() for page in reader.pages)


def test_pdf_report_is_generated_with_real_content(client):
    org_id = _register_login_and_create_org(client, "epdf1@example.com", "Empresa EPDF 1")
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-06-01", "revenue": 10000, "costs": 4000, "expenses": 1000},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/executive/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert (
        'filename="relatorio_executivo_2026-06-01_2026-06-30.pdf"'
        in resp.headers["content-disposition"]
    )
    assert resp.content[:4] == b"%PDF"

    text = _extract_text(resp.content)
    assert "Empresa EPDF 1" in text
    assert "Relatório Executivo" in text
    assert "KPIs Executivos" in text
    assert "5.000" in text  # lucro = 10000 - 4000 - 1000
    assert "Evolução Mensal" in text
    # Sem meta e sem campanha no periodo -> secoes omitidas por completo
    # (RN-003: nunca uma secao vazia).
    assert "Progresso de Metas" not in text
    assert "Marketing do Período" not in text
    assert "Marketing por Canal" not in text


def test_pdf_report_includes_target_progress_when_target_exists(client):
    org_id = _register_login_and_create_org(client, "epdf2@example.com", "Empresa EPDF 2")
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-06-01", "revenue": 12000, "costs": 4000, "expenses": 1000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 10000},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/executive/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    text = _extract_text(resp.content)
    assert "Progresso de Metas" in text
    assert "120,0%" in text  # 12000 / 10000


def test_pdf_report_includes_marketing_sections_when_channel_has_data(client):
    org_id = _register_login_and_create_org(client, "epdf3@example.com", "Empresa EPDF 3")
    channel_id = client.post(
        f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": "Google Ads"}
    ).json()["id"]
    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": channel_id,
            "name": "Campanha Junho",
            "start_date": "2026-06-01",
            "end_date": "2026-06-30",
            "investment": 1000,
            "attributed_revenue": 4000,
        },
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/executive/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    text = _extract_text(resp.content)
    assert "Marketing do Período" in text
    assert "Marketing por Canal" in text
    assert "Google Ads" in text


def test_pdf_report_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "epdf4@example.com", "Empresa EPDF 4")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/executive/pdf",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_pdf_report_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "epdf5a@example.com", "Empresa EPDF 5A")
    _register_login_and_create_org(client_b, "epdf5b@example.com", "Empresa EPDF 5B")

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/reports/executive/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404


def test_viewer_cannot_generate_executive_pdf_report(client_factory):
    owner = client_factory()
    viewer_client = client_factory()
    _register_and_login(owner, "Ana", "epdf6.owner@example.com")
    _register_and_login(viewer_client, "Vitor", "epdf6.viewer@example.com")

    org_id = owner.post("/api/v1/organizations", json={"name": "Empresa EPDF 6"}).json()["id"]
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "epdf6.viewer@example.com", "role": "VIEWER"},
    )

    resp = viewer_client.get(
        f"/api/v1/organizations/{org_id}/reports/executive/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 403
