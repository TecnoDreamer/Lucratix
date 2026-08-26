"""Métricas de campanha por intervalo de datas (/analytics/marketing)."""


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


def test_marketing_analytics_aggregates_campaigns_in_range(client):
    org_id = _register_login_and_create_org(client, "mktan1@example.com", "Empresa MktAn 1")
    channel_id = _create_channel(client, org_id)

    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": channel_id,
            "name": "Campanha Junho",
            "start_date": "2026-06-01",
            "end_date": "2026-06-30",
            "investment": 1000,
            "impressions": 10000,
            "clicks": 500,
            "leads": 50,
            "customers": 10,
            "attributed_revenue": 4000,
        },
    )
    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": channel_id,
            "name": "Campanha Julho",
            "start_date": "2026-07-01",
            "end_date": "2026-07-31",
            "investment": 1500,
            "impressions": 20000,
            "clicks": 800,
            "leads": 70,
            "customers": 15,
            "attributed_revenue": 6000,
        },
    )
    # Fora do intervalo consultado — nao deve entrar na soma.
    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": channel_id,
            "name": "Campanha Janeiro",
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "investment": 500,
            "attributed_revenue": 100,
        },
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing",
        params={"date_from": "2026-06-01", "date_to": "2026-07-31"},
    )
    assert resp.status_code == 200
    body = resp.json()

    assert body["campaign_count"] == 2
    assert body["roas"]["current"]["value"] == 4000 / 2500  # 10000/2500
    assert body["ctr"]["current"]["value"] == 1300 / 30000


def test_marketing_analytics_excludes_campaigns_without_any_date(client):
    org_id = _register_login_and_create_org(client, "mktan2@example.com", "Empresa MktAn 2")
    channel_id = _create_channel(client, org_id)

    client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={"channel_id": channel_id, "name": "Sem data", "investment": 999, "attributed_revenue": 999},
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing",
        params={"date_from": "2026-01-01", "date_to": "2026-12-31"},
    )
    assert resp.status_code == 200
    assert resp.json()["campaign_count"] == 0


def test_marketing_analytics_without_campaigns_is_not_applicable(client):
    org_id = _register_login_and_create_org(client, "mktan3@example.com", "Empresa MktAn 3")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing",
        params={"date_from": "2026-01-01", "date_to": "2026-01-31"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["campaign_count"] == 0
    assert body["roas"]["current"]["is_applicable"] is False


def test_marketing_analytics_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "mktan4@example.com", "Empresa MktAn 4")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/marketing",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_marketing_analytics_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "mktan5a@example.com", "Empresa MktAn 5A")
    _register_login_and_create_org(client_b, "mktan5b@example.com", "Empresa MktAn 5B")

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/marketing",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404
