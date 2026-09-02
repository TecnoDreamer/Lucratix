"""Drill-down do funil por canal (/analytics/funnel/by-channel)."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _create_channel(client, org_id: str, name: str = "Google Ads") -> str:
    return client.post(
        f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": name}
    ).json()["id"]


def _upsert_snapshot(client, org_id: str, **payload) -> dict:
    resp = client.put(f"/api/v1/organizations/{org_id}/funnel-snapshots", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_funnel_by_channel_separates_channels_not_mixed_together(client):
    org_id = _register_login_and_create_org(client, "funbych1@example.com", "Empresa FunByCh 1")
    google_id = _create_channel(client, org_id, "Google Ads")
    instagram_id = _create_channel(client, org_id, "Instagram")

    _upsert_snapshot(client, org_id, period="2026-06-01", channel_id=google_id, leads=100, mqls=50)
    _upsert_snapshot(client, org_id, period="2026-06-01", channel_id=instagram_id, leads=200, mqls=40)

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel/by-channel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    by_name = {c["channel_name"]: c for c in resp.json()["channels"]}
    assert by_name["Google Ads"]["stages"]["leads"]["value"] == 100
    assert by_name["Instagram"]["stages"]["leads"]["value"] == 200


def test_funnel_by_channel_omits_channel_without_snapshot_in_range(client):
    org_id = _register_login_and_create_org(client, "funbych2@example.com", "Empresa FunByCh 2")
    _create_channel(client, org_id, "Canal Sem Snapshot")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel/by-channel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    assert resp.json()["channels"] == []


def test_funnel_by_channel_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "funbych3a@example.com", "Empresa FunByCh 3A")
    _register_login_and_create_org(client_b, "funbych3b@example.com", "Empresa FunByCh 3B")

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/funnel/by-channel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404
