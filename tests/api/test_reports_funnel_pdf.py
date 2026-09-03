"""Relatorio do Funil em PDF (/reports/funnel/pdf) — server-side, ReportLab."""

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


def _create_channel(client, org_id: str, name: str = "Google Ads") -> str:
    return client.post(
        f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": name}
    ).json()["id"]


def _upsert_snapshot(client, org_id: str, **payload) -> dict:
    resp = client.put(f"/api/v1/organizations/{org_id}/funnel-snapshots", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _extract_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() for page in reader.pages)


def test_pdf_report_is_generated_with_real_content(client):
    org_id = _register_login_and_create_org(client, "pdf1@example.com", "Empresa PDF 1")
    _upsert_snapshot(
        client, org_id, period="2026-06-01",
        impressions=10000, visits=3000, leads=800, mqls=400, sqls=200,
        opportunities=120, customers=50, repeat_purchases=12,
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/funnel/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert 'filename="funil_relatorio_2026-06-01_2026-06-30.pdf"' in resp.headers["content-disposition"]
    assert resp.content[:4] == b"%PDF"

    text = _extract_text(resp.content)
    assert "Empresa PDF 1" in text
    assert "Relatório do Funil" in text
    assert "10.000" in text  # impressoes
    assert "Leads → MQLs" in text
    assert "50,0%" in text  # 400/800
    # Sumario executivo/observacoes deterministicas presentes.
    assert "menor taxa de conversão" in text
    # Sem nenhum canal com dado no periodo — secao de canal omitida por
    # completo (RN-003: nunca uma secao vazia).
    assert "Segmentação por Canal" not in text


def test_pdf_report_includes_channel_sections_when_channel_has_data(client):
    org_id = _register_login_and_create_org(client, "pdf2@example.com", "Empresa PDF 2")
    channel_id = _create_channel(client, org_id, "Google Ads")
    _upsert_snapshot(client, org_id, period="2026-06-01", channel_id=channel_id, leads=300, mqls=150)

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/funnel/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    text = _extract_text(resp.content)
    assert "Segmentação por Canal" in text
    assert "Comparação entre Canais" in text
    assert "Google Ads" in text


def test_pdf_report_without_data_is_generated_gracefully_not_an_error(client):
    org_id = _register_login_and_create_org(client, "pdf3@example.com", "Empresa PDF 3")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/funnel/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    text = _extract_text(resp.content)
    assert "Dados insuficientes" in text
    assert "Não aplicável" in text


def test_pdf_report_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "pdf4@example.com", "Empresa PDF 4")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/reports/funnel/pdf",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_pdf_report_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "pdf5a@example.com", "Empresa PDF 5A")
    _register_login_and_create_org(client_b, "pdf5b@example.com", "Empresa PDF 5B")

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/reports/funnel/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404


def test_viewer_cannot_generate_pdf_report(client_factory):
    owner = client_factory()
    viewer_client = client_factory()
    _register_and_login(owner, "Ana", "pdf6.owner@example.com")
    _register_and_login(viewer_client, "Vitor", "pdf6.viewer@example.com")

    org_id = owner.post("/api/v1/organizations", json={"name": "Empresa PDF 6"}).json()["id"]
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "pdf6.viewer@example.com", "role": "VIEWER"},
    )

    resp = viewer_client.get(
        f"/api/v1/organizations/{org_id}/reports/funnel/pdf",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 403
