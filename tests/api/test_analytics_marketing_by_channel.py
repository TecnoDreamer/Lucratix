"""Drill-down de métricas de campanha por canal (/analytics/marketing/by-channel)."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _create_channel(client, org_id: str, name: str) -> str:
    return client.post(
        f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": name}
    ).json()["id"]


def test_metrics_are_separated_by_channel_not_mixed_together(client):
    org_id = _register_login_and_create_org(client, "mktch1@example.com", "Empresa MktCh 1")
    google_id = _create_channel(client, org_id, "Google Ads")
    instagram_id = _create_channel(client, org_id, "Instagram")

    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": google_id,
            "name": "Campanha Google",
            "start_date": "2026-06-01",
            "end_date": "2026-06-30",
            "investment": 1000,
            "clicks": 500,
            "attributed_revenue": 4000,
        },
    )
    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": instagram_id,
            "name": "Campanha Instagram",
            "start_date": "2026-06-01",
            "end_date": "2026-06-30",
            "investment": 500,
            "clicks": 300,
            "attributed_revenue": 1000,
        },
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing/by-channel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    body = resp.json()

    assert len(body["channels"]) == 2
    by_name = {c["channel_name"]: c for c in body["channels"]}
    assert by_name["Google Ads"]["campaign_count"] == 1
    assert by_name["Google Ads"]["roas"]["value"] == 4.0  # 4000/1000 — nunca misturado com Instagram
    assert by_name["Instagram"]["campaign_count"] == 1
    assert by_name["Instagram"]["roas"]["value"] == 2.0  # 1000/500


def test_two_campaigns_same_channel_are_aggregated_together(client):
    org_id = _register_login_and_create_org(client, "mktch2@example.com", "Empresa MktCh 2")
    channel_id = _create_channel(client, org_id, "Google Ads")

    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": channel_id,
            "name": "Campanha A",
            "start_date": "2026-06-01",
            "end_date": "2026-06-30",
            "investment": 1000,
            "attributed_revenue": 3000,
        },
    )
    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": channel_id,
            "name": "Campanha B",
            "start_date": "2026-06-01",
            "end_date": "2026-06-30",
            "investment": 500,
            "attributed_revenue": 1000,
        },
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing/by-channel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    body = resp.json()

    assert len(body["channels"]) == 1
    channel = body["channels"][0]
    assert channel["campaign_count"] == 2
    assert channel["roas"]["value"] == 4000 / 1500


def test_channel_without_campaign_in_range_is_omitted(client):
    org_id = _register_login_and_create_org(client, "mktch3@example.com", "Empresa MktCh 3")
    _create_channel(client, org_id, "Canal Sem Campanha")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing/by-channel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    assert resp.json()["channels"] == []


def test_channels_are_sorted_alphabetically(client):
    org_id = _register_login_and_create_org(client, "mktch4@example.com", "Empresa MktCh 4")
    zeta_id = _create_channel(client, org_id, "Zeta Ads")
    alpha_id = _create_channel(client, org_id, "Alpha Ads")

    for channel_id, name in [(zeta_id, "Zeta"), (alpha_id, "Alpha")]:
        client.post(
            f"/api/v1/organizations/{org_id}/campaigns",
            json={
                "channel_id": channel_id,
                "name": f"Campanha {name}",
                "start_date": "2026-06-01",
                "end_date": "2026-06-30",
                "investment": 100,
            },
        )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing/by-channel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    names = [c["channel_name"] for c in resp.json()["channels"]]
    assert names == ["Alpha Ads", "Zeta Ads"]


def test_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "mktch5@example.com", "Empresa MktCh 5")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing/by-channel",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "mktch6a@example.com", "Empresa MktCh 6A")
    _register_login_and_create_org(client_b, "mktch6b@example.com", "Empresa MktCh 6B")

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/marketing/by-channel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404
