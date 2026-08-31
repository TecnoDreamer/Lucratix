"""RF-024, RF-025, RN-013 — experimentos de CRO."""

import pytest


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_create_experiment_with_variants(client):
    org_id = _register_login_and_create_org(client, "exp1@example.com", "Empresa Exp 1")

    resp = client.post(
        f"/api/v1/organizations/{org_id}/experiments",
        json={
            "hypothesis": "Botao verde converte mais que azul",
            "page_or_process": "Checkout",
            "primary_metric": "conversion_rate",
            "variants": [{"name": "Controle (azul)"}, {"name": "Variante (verde)"}],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["variants"]) == 2
    assert body["status"] == "draft"


def test_experiment_result_has_no_leader_without_enough_sample(client):
    org_id = _register_login_and_create_org(client, "exp2@example.com", "Empresa Exp 2")

    experiment = client.post(
        f"/api/v1/organizations/{org_id}/experiments",
        json={
            "hypothesis": "H",
            "page_or_process": "P",
            "primary_metric": "conversion_rate",
            "variants": [{"name": "A"}, {"name": "B"}],
        },
    ).json()

    variant_a, variant_b = experiment["variants"]
    client.patch(
        f"/api/v1/organizations/{org_id}/experiments/{experiment['id']}/variants/{variant_a['id']}",
        json={"sample_size": 5, "conversions": 4},
    )
    client.patch(
        f"/api/v1/organizations/{org_id}/experiments/{experiment['id']}/variants/{variant_b['id']}",
        json={"sample_size": 5, "conversions": 1},
    )

    result = client.get(f"/api/v1/organizations/{org_id}/experiments/{experiment['id']}/result").json()
    assert result["has_sufficient_sample"] is False
    assert result["leading_variant_name"] is None
    assert "RN-013" in result["note"]


def test_experiment_result_includes_significance_test_above_minimum_sample(client):
    org_id = _register_login_and_create_org(client, "exp3@example.com", "Empresa Exp 3")

    experiment = client.post(
        f"/api/v1/organizations/{org_id}/experiments",
        json={
            "hypothesis": "H",
            "page_or_process": "P",
            "primary_metric": "conversion_rate",
            "variants": [{"name": "Controle"}, {"name": "Variante"}],
        },
    ).json()

    control, variant = experiment["variants"]
    client.patch(
        f"/api/v1/organizations/{org_id}/experiments/{experiment['id']}/variants/{control['id']}",
        json={"sample_size": 30, "conversions": 20},
    )
    client.patch(
        f"/api/v1/organizations/{org_id}/experiments/{experiment['id']}/variants/{variant['id']}",
        json={"sample_size": 30, "conversions": 10},
    )

    result = client.get(f"/api/v1/organizations/{org_id}/experiments/{experiment['id']}/result").json()
    assert result["has_sufficient_sample"] is True
    assert result["significance_alpha"] == 0.05

    control_summary, variant_summary = result["variants"]
    assert control_summary["p_value"] is None  # controle nunca compara contra si mesma
    assert variant_summary["p_value"] == pytest.approx(0.009823, abs=1e-6)
    assert variant_summary["is_significant"] is True
