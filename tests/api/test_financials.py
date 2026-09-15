"""RF-017 — dados financeiros por periodo."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_upsert_financial_period_computes_profit_and_margin(client):
    org_id = _register_login_and_create_org(client, "fin1@example.com", "Empresa Fin 1")

    resp = client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={
            "period": "2026-01-01",
            "revenue": 10000,
            "costs": 3000,
            "expenses": 1000,
            "marketing_investment": 2000,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["profit"] == 6000
    assert body["margin"] == 0.6


def test_upsert_same_period_updates_instead_of_duplicating(client):
    org_id = _register_login_and_create_org(client, "fin2@example.com", "Empresa Fin 2")

    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-02-01", "revenue": 1000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-02-01", "revenue": 2000},
    )

    periods = client.get(f"/api/v1/organizations/{org_id}/financials").json()
    matching = [p for p in periods if p["period"] == "2026-02-01"]
    assert len(matching) == 1
    assert matching[0]["revenue"] == 2000


def test_margin_not_applicable_when_revenue_is_zero(client):
    org_id = _register_login_and_create_org(client, "fin3@example.com", "Empresa Fin 3")

    resp = client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-03-01", "revenue": 0, "costs": 100},
    )
    assert resp.json()["margin"] is None  # RN-003: sem divisao por zero


def test_negative_revenue_is_rejected(client):
    # RN-017: nenhum dos 5 campos monetarios do periodo financeiro tem
    # sentido de negocio negativo.
    org_id = _register_login_and_create_org(client, "fin4@example.com", "Empresa Fin 4")

    resp = client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-04-01", "revenue": -100},
    )
    assert resp.status_code == 422


def test_negative_costs_expenses_investment_and_taxes_are_rejected(client):
    org_id = _register_login_and_create_org(client, "fin5@example.com", "Empresa Fin 5")

    for field in ("costs", "expenses", "marketing_investment", "taxes"):
        resp = client.put(
            f"/api/v1/organizations/{org_id}/financials",
            json={"period": "2026-05-01", field: -1},
        )
        assert resp.status_code == 422, field
