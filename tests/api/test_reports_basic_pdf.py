"""Relatorio Basico em PDF (/reports/basic/pdf) — server-side, ReportLab.
PR4: adocao do padrao de PDF da PR3 (funil) em outra tela (RF-026)."""

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
    org_id = _register_login_and_create_org(client, "bpdf1@example.com", "Empresa BPDF 1")
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-06-01", "revenue": 10000, "costs": 4000, "expenses": 1000},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/basic/pdf", params={"period": "2026-06-01"}
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert 'filename="relatorio_2026-06-01.pdf"' in resp.headers["content-disposition"]
    assert resp.content[:4] == b"%PDF"

    text = _extract_text(resp.content)
    assert "Empresa BPDF 1" in text
    assert "Relatório Básico" in text
    assert "KPIs do Período" in text
    assert "5.000" in text  # lucro = 10000 - 4000 - 1000
    assert "Organização ainda não possui baseline registrado." in text
    # Sem campanha no periodo -> secao de marketing omitida por completo
    # (RN-003: nunca uma secao vazia).
    assert "Marketing do Período" not in text


def test_pdf_report_includes_baseline_comparison_when_baseline_exists(client):
    org_id = _register_login_and_create_org(client, "bpdf2@example.com", "Empresa BPDF 2")
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-06-01", "revenue": 12000, "costs": 4000, "expenses": 1000},
    )
    client.post(f"/api/v1/organizations/{org_id}/baselines", json={"revenue": 10000, "profit": 6000})

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/basic/pdf", params={"period": "2026-06-01"}
    )
    assert resp.status_code == 200
    text = _extract_text(resp.content)
    assert "Comparação com o Baseline" in text
    assert "+20,0%" in text  # 12000 vs 10000


def test_pdf_report_includes_marketing_section_when_campaign_has_data(client):
    org_id = _register_login_and_create_org(client, "bpdf3@example.com", "Empresa BPDF 3")
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
        f"/api/v1/organizations/{org_id}/reports/basic/pdf", params={"period": "2026-06-01"}
    )
    assert resp.status_code == 200
    text = _extract_text(resp.content)
    assert "Marketing do Período" in text
    assert "ROAS" in text


def test_pdf_report_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "bpdf4a@example.com", "Empresa BPDF 4A")
    _register_login_and_create_org(client_b, "bpdf4b@example.com", "Empresa BPDF 4B")

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/reports/basic/pdf", params={"period": "2026-06-01"}
    )
    assert resp.status_code == 404


def test_viewer_cannot_generate_basic_pdf_report(client_factory):
    owner = client_factory()
    viewer_client = client_factory()
    _register_and_login(owner, "Ana", "bpdf5.owner@example.com")
    _register_and_login(viewer_client, "Vitor", "bpdf5.viewer@example.com")

    org_id = owner.post("/api/v1/organizations", json={"name": "Empresa BPDF 5"}).json()["id"]
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "bpdf5.viewer@example.com", "role": "VIEWER"},
    )

    resp = viewer_client.get(
        f"/api/v1/organizations/{org_id}/reports/basic/pdf", params={"period": "2026-06-01"}
    )
    assert resp.status_code == 403
