"""GET /analytics/executive/targets — progresso em relacao a meta."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_revenue_target_progress_sums_across_months(client):
    org_id = _register_login_and_create_org(client, "tgtx1@example.com", "Empresa Meta 1")

    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 10000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-07-01", "value": 12000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-06-01", "revenue": 9000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-07-01", "revenue": 13000},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/targets",
        params={"date_from": "2026-06-01", "date_to": "2026-07-31"},
    )
    assert resp.status_code == 200
    body = resp.json()

    assert body["revenue"]["target_value"] == 22000
    assert body["revenue"]["percent_of_target"]["value"] == (9000 + 13000) / 22000
    assert body["revenue"]["percent_of_target"]["is_applicable"] is True


def test_ratio_metric_never_shows_aggregated_progress(client):
    org_id = _register_login_and_create_org(client, "tgtx2@example.com", "Empresa Meta 2")

    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "cac", "period": "2026-06-01", "value": 100},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/targets",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    body = resp.json()

    assert body["cac"]["target_value"] is None
    assert body["cac"]["percent_of_target"]["is_applicable"] is False


def test_monthly_breakdown_has_one_point_per_month_with_raw_target_values(client):
    org_id = _register_login_and_create_org(client, "tgtx3@example.com", "Empresa Meta 3")

    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "cac", "period": "2026-06-01", "value": 100},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "cac", "period": "2026-08-01", "value": 120},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/targets",
        params={"date_from": "2026-06-01", "date_to": "2026-08-31"},
    )
    body = resp.json()

    assert [p["period"] for p in body["monthly"]] == ["2026-06-01", "2026-07-01", "2026-08-01"]
    assert body["monthly"][0]["cac"] == 100
    assert body["monthly"][1]["cac"] is None  # julho sem meta definida — nunca 0
    assert body["monthly"][2]["cac"] == 120


def test_no_target_set_is_not_applicable_not_zero(client):
    org_id = _register_login_and_create_org(client, "tgtx4@example.com", "Empresa Meta 4")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/targets",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    body = resp.json()

    assert body["revenue"]["target_value"] is None
    assert body["revenue"]["percent_of_target"]["is_applicable"] is False
    assert body["revenue"]["percent_of_target"]["value"] is None


def test_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "tgtx5@example.com", "Empresa Meta 5")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/targets",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "tgtx6a@example.com", "Empresa Meta 6A")
    _register_login_and_create_org(client_b, "tgtx6b@example.com", "Empresa Meta 6B")

    client_a.put(
        f"/api/v1/organizations/{org_a}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 10000},
    )

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/executive/targets",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404
