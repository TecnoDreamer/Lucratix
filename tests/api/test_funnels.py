"""RF-020 — snapshot de funil por periodo."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_upsert_funnel_snapshot(client):
    org_id = _register_login_and_create_org(client, "funnel1@example.com", "Empresa Funil 1")

    resp = client.put(
        f"/api/v1/organizations/{org_id}/funnel-snapshots",
        json={"period": "2026-01-01", "impressions": 10000, "leads": 200, "customers": 20},
    )
    assert resp.status_code == 200
    assert resp.json()["leads"] == 200
    assert resp.json()["visits"] is None  # nao informado, nao aplicavel/ausente (RN-004)


def test_upsert_same_period_updates_not_duplicates(client):
    org_id = _register_login_and_create_org(client, "funnel2@example.com", "Empresa Funil 2")

    client.put(
        f"/api/v1/organizations/{org_id}/funnel-snapshots",
        json={"period": "2026-02-01", "leads": 100},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/funnel-snapshots",
        json={"period": "2026-02-01", "leads": 150},
    )

    snapshots = client.get(f"/api/v1/organizations/{org_id}/funnel-snapshots").json()
    matching = [s for s in snapshots if s["period"] == "2026-02-01"]
    assert len(matching) == 1
    assert matching[0]["leads"] == 150


def test_negative_stage_count_is_rejected(client):
    # RN-017: as 8 etapas do funil sao contagens, nao existe valor negativo.
    org_id = _register_login_and_create_org(client, "funnel3@example.com", "Empresa Funil 3")

    resp = client.put(
        f"/api/v1/organizations/{org_id}/funnel-snapshots",
        json={"period": "2026-03-01", "leads": -5},
    )
    assert resp.status_code == 422
