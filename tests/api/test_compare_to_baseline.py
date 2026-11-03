"""RF-022, RN-007, L-07 — GET /dashboard/compare-to-baseline."""

import pytest


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _compare(client, org_id: str, metric: str):
    return client.get(
        f"/api/v1/organizations/{org_id}/dashboard/compare-to-baseline",
        params={"period": "2026-08-01", "metric": metric},
    )


def _seed_period(client, org_id: str) -> None:
    client.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-08-01", "revenue": 10000, "costs": 4000, "marketing_investment": 2000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/funnel-snapshots",
        json={"period": "2026-08-01", "leads": 100, "customers": 20, "repeat_purchases": 5},
    )


@pytest.mark.parametrize(
    ("metric", "baseline_value", "current_value"),
    [
        ("revenue", 8000, 10000),
        ("profit", 4000, 6000),
        ("margin", 0.5, 0.6),
        ("cac", 120, 100),
        # L-07: antes so as 4 acima eram comparaveis.
        ("conversion_rate", 0.1, 0.2),  # 20 clientes / 100 leads
        ("average_ticket", 400, 500),  # 10000 / 20 clientes
        ("recurrence_rate", 0.5, 0.25),  # 5 recorrentes / 20 clientes
    ],
)
def test_compare_to_baseline_supports_every_dashboard_metric(client, metric, baseline_value, current_value):
    org_id = _register_login_and_create_org(client, f"cmp.{metric}@example.com", f"Empresa Cmp {metric}")
    _seed_period(client, org_id)
    client.post(f"/api/v1/organizations/{org_id}/baselines", json={metric: baseline_value})

    resp = _compare(client, org_id, metric)

    assert resp.status_code == 200
    body = resp.json()
    assert body["baseline_value"] == pytest.approx(baseline_value)
    assert body["current_value"] == pytest.approx(current_value)
    assert body["absolute_change"] == pytest.approx(current_value - baseline_value)
    assert body["percent_change"] == pytest.approx((current_value - baseline_value) / baseline_value)


def test_compare_to_baseline_without_baseline_value_for_metric_makes_no_claim(client):
    """Baseline registrado sem `conversion_rate`: a comparacao existe mas nao
    afirma variacao nenhuma (RN-003/RN-004 — ausencia nunca vira zero)."""
    org_id = _register_login_and_create_org(client, "cmp.missing@example.com", "Empresa Cmp Missing")
    _seed_period(client, org_id)
    client.post(f"/api/v1/organizations/{org_id}/baselines", json={"revenue": 8000})

    body = _compare(client, org_id, "conversion_rate").json()

    assert body["baseline_value"] is None
    assert body["current_value"] == pytest.approx(0.2)
    assert body["absolute_change"] is None
    assert body["percent_change"] is None


def test_compare_to_baseline_without_any_baseline_is_404(client):
    org_id = _register_login_and_create_org(client, "cmp.nobase@example.com", "Empresa Cmp NoBase")
    _seed_period(client, org_id)

    assert _compare(client, org_id, "conversion_rate").status_code == 404


@pytest.mark.parametrize("metric", ["customer_count", "marketing_investment", "leads", "nao_existe"])
def test_compare_to_baseline_rejects_inputs_that_are_not_dashboard_metrics(client, metric):
    org_id = _register_login_and_create_org(
        client, f"cmp.bad.{metric}@example.com", f"Empresa Cmp Bad {metric}"
    )
    client.post(f"/api/v1/organizations/{org_id}/baselines", json={"revenue": 8000})

    assert _compare(client, org_id, metric).status_code == 422
