"""Chaves de API por organização (docs/security/API_KEYS.md) — criação,
listagem, revogação e autenticação de endpoints de analytics via
`Authorization: Bearer <chave>` no lugar do cookie de sessão."""

from app.core.rate_limit import api_key_create_rate_limiter


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_create_api_key_returns_raw_value_once(client):
    org_id = _register_login_and_create_org(client, "apikey.create@example.com", "Empresa API Key 1")

    resp = client.post(f"/api/v1/organizations/{org_id}/api-keys", json={"name": "Power BI"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["raw_key"].startswith("lucratix_")
    assert body["key_prefix"] == body["raw_key"][:16]
    assert body["name"] == "Power BI"
    assert body["revoked_at"] is None


def test_list_api_keys_never_returns_the_raw_value(client):
    org_id = _register_login_and_create_org(client, "apikey.list@example.com", "Empresa API Key 2")
    client.post(f"/api/v1/organizations/{org_id}/api-keys", json={"name": "Power BI"})

    listed = client.get(f"/api/v1/organizations/{org_id}/api-keys").json()
    assert len(listed) == 1
    assert "raw_key" not in listed[0]
    assert "key_hash" not in listed[0]


def test_non_admin_role_gets_403_creating_api_key(client_factory):
    owner = client_factory()
    org_id = _register_login_and_create_org(owner, "apikey.owner2@example.com", "Empresa API Key 4")

    viewer = client_factory()
    viewer.post(
        "/api/v1/auth/register",
        json={"name": "Bruno", "email": "apikey.viewer@example.com", "password": "SenhaForte123!"},
    )
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "apikey.viewer@example.com", "role": "VIEWER"},
    )
    viewer.post(
        "/api/v1/auth/login", json={"email": "apikey.viewer@example.com", "password": "SenhaForte123!"}
    )

    resp = viewer.post(f"/api/v1/organizations/{org_id}/api-keys", json={"name": "Tentativa"})
    assert resp.status_code == 403


def test_revoke_is_idempotent_and_key_stops_authenticating(client_factory):
    admin = client_factory()
    org_id = _register_login_and_create_org(admin, "apikey.revoke@example.com", "Empresa API Key 5")
    created = admin.post(f"/api/v1/organizations/{org_id}/api-keys", json={"name": "Chave"}).json()
    key_id = created["id"]
    raw_key = created["raw_key"]

    first = admin.delete(f"/api/v1/organizations/{org_id}/api-keys/{key_id}")
    assert first.status_code == 204
    second = admin.delete(f"/api/v1/organizations/{org_id}/api-keys/{key_id}")
    assert second.status_code == 204

    anonymous = client_factory()
    resp = anonymous.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert resp.status_code == 401


def test_api_key_authenticates_analytics_endpoint_without_any_cookie(client_factory):
    admin = client_factory()
    org_id = _register_login_and_create_org(admin, "apikey.analytics@example.com", "Empresa API Key 6")
    admin.put(
        f"/api/v1/organizations/{org_id}/financials",
        json={"period": "2026-06-01", "revenue": 10000, "costs": 3000, "marketing_investment": 2000},
    )
    raw_key = admin.post(f"/api/v1/organizations/{org_id}/api-keys", json={"name": "Chave"}).json()[
        "raw_key"
    ]

    anonymous = client_factory()  # nunca fez login -- sem cookie nenhum
    resp = anonymous.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert resp.status_code == 200
    assert resp.json()["revenue"]["current"]["value"] == 10000


def test_api_key_from_one_organization_cannot_read_another(client_factory):
    admin_a = client_factory()
    org_a = _register_login_and_create_org(admin_a, "apikey.tenant.a@example.com", "Empresa A")
    raw_key_a = admin_a.post(f"/api/v1/organizations/{org_a}/api-keys", json={"name": "Chave A"}).json()[
        "raw_key"
    ]

    admin_b = client_factory()
    org_b = _register_login_and_create_org(admin_b, "apikey.tenant.b@example.com", "Empresa B")

    anonymous = client_factory()
    resp = anonymous.get(
        f"/api/v1/organizations/{org_b}/analytics/executive",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
        headers={"Authorization": f"Bearer {raw_key_a}"},
    )
    assert resp.status_code == 401


def test_funnel_endpoint_is_not_reachable_via_api_key(client_factory):
    # Fora do escopo documentado (docs/security/API_KEYS.md) -- so os 6
    # endpoints de analytics/executive e analytics/marketing aceitam chave;
    # /analytics/funnel continua exclusivo de sessao.
    admin = client_factory()
    org_id = _register_login_and_create_org(admin, "apikey.funnel@example.com", "Empresa API Key 7")
    raw_key = admin.post(f"/api/v1/organizations/{org_id}/api-keys", json={"name": "Chave"}).json()[
        "raw_key"
    ]

    anonymous = client_factory()
    resp = anonymous.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
        headers={"Authorization": f"Bearer {raw_key}"},
    )
    assert resp.status_code == 401


def test_malformed_authorization_header_is_rejected(client_factory):
    admin = client_factory()
    org_id = _register_login_and_create_org(admin, "apikey.malformed@example.com", "Empresa API Key 8")

    anonymous = client_factory()
    resp = anonymous.get(
        f"/api/v1/organizations/{org_id}/analytics/executive",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
        headers={"Authorization": "Basic isto-nao-e-bearer"},
    )
    assert resp.status_code == 401


def test_api_key_create_is_rate_limited(client):
    org_id = _register_login_and_create_org(client, "apikey.ratelimit@example.com", "Empresa API Key 9")

    for i in range(api_key_create_rate_limiter.max_attempts):
        resp = client.post(f"/api/v1/organizations/{org_id}/api-keys", json={"name": f"Chave {i}"})
        assert resp.status_code == 201

    blocked = client.post(f"/api/v1/organizations/{org_id}/api-keys", json={"name": "Bloqueada"})
    assert blocked.status_code == 429
