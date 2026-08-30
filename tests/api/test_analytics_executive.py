"""RF-023 — visao executiva por intervalo de datas (/analytics/executive)."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_executive_dashboard_aggregates_multiple_months(client):
    org_id = _register_login_and_create_org(client, "exec1@example.com", "Empresa Exec 1")

    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-06-01", "revenue": 10000, "costs": 3000, "marketing_investment": 2000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-07-01", "revenue": 12000, "costs": 3500, "marketing_investment": 2500},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/funnel-snapshots",
        json={"period": "2026-06-01", "leads": 50, "customers": 10},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/funnel-snapshots",
        json={"period": "2026-07-01", "leads": 60, "customers": 15},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": "2026-06-01", "date_to": "2026-07-31"},
    )
    assert resp.status_code == 200
    body = resp.json()

    assert body["months_in_range"] == 2
    assert body["months_with_financial_data"] == 2
    assert body["months_with_funnel_data"] == 2
    assert body["revenue"]["current"]["value"] == 22000
    assert body["cac"]["current"]["value"] == 4500 / 25  # (2000+2500) / (10+15)

    # Sem dado no periodo anterior equivalente: comparacao existe mas nao
    # afirma variacao nenhuma (RN-003 — nunca vira "0%").
    assert body["revenue"]["comparison"]["absolute_change"] is None
    assert body["revenue"]["comparison"]["percent_change"] is None


def test_executive_dashboard_with_no_data_is_not_applicable(client):
    org_id = _register_login_and_create_org(client, "exec2@example.com", "Empresa Exec 2")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": "2026-01-01", "date_to": "2026-01-31"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["months_with_financial_data"] == 0
    assert body["revenue"]["current"]["is_applicable"] is False
    assert body["revenue"]["current"]["value"] is None


def test_executive_dashboard_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "exec3@example.com", "Empresa Exec 3")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_executive_series_has_one_point_per_month_with_own_data(client):
    org_id = _register_login_and_create_org(client, "exec5@example.com", "Empresa Exec 5")

    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-06-01", "revenue": 10000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-08-01", "revenue": 15000},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/series",
        params={"date_from": "2026-06-01", "date_to": "2026-08-31"},
    )
    assert resp.status_code == 200
    body = resp.json()

    assert [p["period"] for p in body["points"]] == ["2026-06-01", "2026-07-01", "2026-08-01"]
    assert body["points"][0]["revenue"]["value"] == 10000
    # Julho nao tem financial_period: aparece no meio da lista (nunca
    # omitido), mas nao aplicavel — nunca vira 0 (RN-003).
    assert body["points"][1]["revenue"]["is_applicable"] is False
    assert body["points"][1]["revenue"]["value"] is None
    assert body["points"][2]["revenue"]["value"] == 15000


def test_executive_series_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "exec6@example.com", "Empresa Exec 6")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/series",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_executive_series_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "exec7a@example.com", "Empresa Exec 7A")
    _register_login_and_create_org(client_b, "exec7b@example.com", "Empresa Exec 7B")

    client_a.put(
        f"/api/v1/organizations/{org_a}/financials",
        json={"period": "2026-06-01", "revenue": 5000},
    )

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/executive/series",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404


def test_executive_dashboard_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "exec4a@example.com", "Empresa Exec 4A")
    _register_login_and_create_org(client_b, "exec4b@example.com", "Empresa Exec 4B")

    client_a.put(
        f"/api/v1/organizations/{org_a}/financials",
        json={"period": "2026-06-01", "revenue": 5000},
    )

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/executive",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404
