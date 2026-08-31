"""Correlação entre métricas mensais (/analytics/executive/correlation)."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_perfect_correlation_between_revenue_and_profit(client):
    org_id = _register_login_and_create_org(client, "corr1@example.com", "Empresa Corr 1")

    for period, revenue in [("2026-06-01", 10000), ("2026-07-01", 20000), ("2026-08-01", 30000)]:
        client.put(
            f"/api/v1/organizations/{org_id}/financials",
            json={"period": period, "revenue": revenue},
        )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/correlation",
        params={
            "date_from": "2026-06-01",
            "date_to": "2026-08-31",
            "metric_x": "revenue",
            "metric_y": "profit",
        },
    )
    assert resp.status_code == 200
    body = resp.json()

    assert body["months_used"] == 3
    assert body["correlation"]["is_applicable"] is True
    assert body["correlation"]["value"] == 1.0
    assert len(body["points"]) == 3


def test_month_missing_one_metric_appears_as_gap_but_excluded_from_calculation(client):
    org_id = _register_login_and_create_org(client, "corr2@example.com", "Empresa Corr 2")

    client.put(f"/api/v1/organizations/{org_id}/financials", json={"period": "2026-06-01", "revenue": 10000})
    # Julho: sem financial_period nenhum.
    client.put(f"/api/v1/organizations/{org_id}/financials", json={"period": "2026-08-01", "revenue": 12000})

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/correlation",
        params={
            "date_from": "2026-06-01",
            "date_to": "2026-08-31",
            "metric_x": "revenue",
            "metric_y": "profit",
        },
    )
    body = resp.json()

    assert len(body["points"]) == 3  # um ponto por mes do intervalo, mesmo com buraco
    assert body["points"][1]["x"] is None  # julho — nunca 0
    assert body["months_used"] == 2  # so jun/ago tem as duas metricas
    assert body["correlation"]["is_applicable"] is False  # menos de 3 pares


def test_same_metric_twice_is_rejected(client):
    org_id = _register_login_and_create_org(client, "corr3@example.com", "Empresa Corr 3")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/correlation",
        params={
            "date_from": "2026-06-01",
            "date_to": "2026-08-31",
            "metric_x": "revenue",
            "metric_y": "revenue",
        },
    )
    assert resp.status_code == 400


def test_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "corr4@example.com", "Empresa Corr 4")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/correlation",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01", "metric_x": "revenue", "metric_y": "cac"},
    )
    assert resp.status_code == 400


def test_invalid_metric_is_rejected(client):
    org_id = _register_login_and_create_org(client, "corr5@example.com", "Empresa Corr 5")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/executive/correlation",
        params={
            "date_from": "2026-06-01",
            "date_to": "2026-08-31",
            "metric_x": "receita_falsa",
            "metric_y": "cac",
        },
    )
    assert resp.status_code == 422


def test_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "corr6a@example.com", "Empresa Corr 6A")
    _register_login_and_create_org(client_b, "corr6b@example.com", "Empresa Corr 6B")

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/executive/correlation",
        params={"date_from": "2026-06-01", "date_to": "2026-08-31", "metric_x": "revenue", "metric_y": "cac"},
    )
    assert resp.status_code == 404
