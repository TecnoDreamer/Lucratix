"""RF-018, RF-019, RN-005 — canais e campanhas de marketing."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_create_campaign_with_valid_channel(client):
    org_id = _register_login_and_create_org(client, "mkt1@example.com", "Empresa Mkt 1")

    channel = client.post(
        f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": "Google Ads"}
    ).json()

    resp = client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={
            "channel_id": channel["id"],
            "name": "Campanha Black Friday",
            "investment": 1000,
            "attributed_revenue": 4000,
            "impressions": 10000,
            "clicks": 500,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["roas"] == 4.0
    assert body["ctr"] == 0.05


def test_campaign_rejects_channel_from_another_organization(client_factory):
    client_a = client_factory()
    client_b = client_factory()

    org_a = _register_login_and_create_org(client_a, "mkt.a@example.com", "Empresa Mkt A")
    org_b = _register_login_and_create_org(client_b, "mkt.b@example.com", "Empresa Mkt B")

    channel_b = client_b.post(
        f"/api/v1/organizations/{org_b}/marketing-channels", json={"name": "Meta Ads"}
    ).json()

    # A tenta criar campanha usando um canal que pertence a organizacao B (RN-005).
    resp = client_a.post(
        f"/api/v1/organizations/{org_a}/campaigns",
        json={"channel_id": channel_b["id"], "name": "Campanha Invalida"},
    )
    assert resp.status_code == 422


def test_campaign_roas_not_applicable_without_investment(client):
    org_id = _register_login_and_create_org(client, "mkt2@example.com", "Empresa Mkt 2")
    channel = client.post(
        f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": "Organico"}
    ).json()

    resp = client.post(
        f"/api/v1/organizations/{org_id}/campaigns",
        json={"channel_id": channel["id"], "name": "Campanha Organica", "attributed_revenue": 500},
    )
    assert resp.json()["roas"] is None
