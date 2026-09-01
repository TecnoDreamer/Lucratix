"""Preferencias de workspace (acessos rapidos configuraveis, 2026-08-31)."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _register_and_login(client, name: str, email: str, password: str = "SenhaForte123!") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": password})
    client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_get_with_no_saved_row_returns_null_quick_access_never_404(client):
    org_id = _register_login_and_create_org(client, "wsp1@example.com", "Empresa WSP 1")

    resp = client.get(f"/api/v1/organizations/{org_id}/workspace-preferences")
    assert resp.status_code == 200
    body = resp.json()
    assert body["organization_id"] == org_id
    assert body["quick_access"] is None
    assert body["updated_at"] is None


def test_patch_saves_order_and_flags(client):
    org_id = _register_login_and_create_org(client, "wsp2@example.com", "Empresa WSP 2")

    resp = client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "marketing", "enabled": True}, {"id": "analytics", "enabled": False}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["quick_access"] == [
        {"id": "marketing", "enabled": True},
        {"id": "analytics", "enabled": False},
    ]

    read_back = client.get(f"/api/v1/organizations/{org_id}/workspace-preferences").json()
    assert read_back["quick_access"] == body["quick_access"]


def test_patch_twice_upserts_single_row_last_write_wins(client):
    org_id = _register_login_and_create_org(client, "wsp3@example.com", "Empresa WSP 3")

    client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "analytics", "enabled": True}]},
    )
    resp = client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "financials", "enabled": True}]},
    )
    assert resp.status_code == 200
    assert resp.json()["quick_access"] == [{"id": "financials", "enabled": True}]


def test_patch_null_restores_default(client):
    org_id = _register_login_and_create_org(client, "wsp4@example.com", "Empresa WSP 4")

    client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "analytics", "enabled": True}]},
    )
    resp = client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": None},
    )
    assert resp.status_code == 200
    assert resp.json()["quick_access"] is None


def test_patch_empty_body_is_a_noop(client):
    org_id = _register_login_and_create_org(client, "wsp5@example.com", "Empresa WSP 5")

    client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "analytics", "enabled": True}]},
    )
    resp = client.patch(f"/api/v1/organizations/{org_id}/workspace-preferences", json={})
    assert resp.status_code == 200
    assert resp.json()["quick_access"] == [{"id": "analytics", "enabled": True}]


def test_unknown_id_is_rejected(client):
    org_id = _register_login_and_create_org(client, "wsp6@example.com", "Empresa WSP 6")

    resp = client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "modulo-inventado", "enabled": True}]},
    )
    assert resp.status_code == 422


def test_duplicate_id_is_rejected(client):
    org_id = _register_login_and_create_org(client, "wsp7@example.com", "Empresa WSP 7")

    resp = client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={
            "quick_access": [
                {"id": "analytics", "enabled": True},
                {"id": "analytics", "enabled": False},
            ]
        },
    )
    assert resp.status_code == 422


def test_oversized_list_is_rejected(client):
    org_id = _register_login_and_create_org(client, "wsp8@example.com", "Empresa WSP 8")

    resp = client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={
            "quick_access": [
                {"id": "analytics", "enabled": True},
                {"id": "financials", "enabled": True},
                {"id": "marketing", "enabled": True},
                {"id": "funnel", "enabled": True},
                {"id": "products", "enabled": True},
                {"id": "experiments", "enabled": True},
                {"id": "central-de-dados", "enabled": True},
                {"id": "central-de-dados-2", "enabled": True},
            ]
        },
    )
    assert resp.status_code == 422


def test_viewer_can_read_and_write_own_preference(client_factory):
    owner = client_factory()
    viewer_client = client_factory()
    _register_and_login(owner, "Ana", "wsp.owner@example.com")
    _register_and_login(viewer_client, "Vitor", "wsp.viewer@example.com")

    org_id = owner.post("/api/v1/organizations", json={"name": "Empresa WSP Viewer"}).json()["id"]
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "wsp.viewer@example.com", "role": "VIEWER"},
    )

    read_resp = viewer_client.get(f"/api/v1/organizations/{org_id}/workspace-preferences")
    assert read_resp.status_code == 200

    write_resp = viewer_client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "analytics", "enabled": False}]},
    )
    assert write_resp.status_code == 200


def test_non_member_gets_404_on_both_verbs(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "wsp9a@example.com", "Empresa WSP 9A")
    _register_login_and_create_org(client_b, "wsp9b@example.com", "Empresa WSP 9B")

    assert client_b.get(f"/api/v1/organizations/{org_a}/workspace-preferences").status_code == 404
    assert (
        client_b.patch(
            f"/api/v1/organizations/{org_a}/workspace-preferences", json={"quick_access": None}
        ).status_code
        == 404
    )


def test_unauthenticated_gets_401(client):
    resp = client.get(
        "/api/v1/organizations/00000000-0000-0000-0000-000000000000/workspace-preferences"
    )
    assert resp.status_code == 401


def test_preferences_are_isolated_per_user_and_per_organization(client_factory):
    user_a = client_factory()
    user_b = client_factory()
    _register_and_login(user_a, "Ana", "wsp10a@example.com")
    _register_and_login(user_b, "Bia", "wsp10b@example.com")

    org_id = user_a.post("/api/v1/organizations", json={"name": "Empresa WSP 10"}).json()["id"]
    user_a.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "wsp10b@example.com", "role": "VIEWER"},
    )

    user_a.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "analytics", "enabled": True}]},
    )

    # Usuario B, mesma organizacao: nunca configurou, deve ver o proprio
    # estado nulo, nao o que o usuario A salvou.
    b_read = user_b.get(f"/api/v1/organizations/{org_id}/workspace-preferences").json()
    assert b_read["quick_access"] is None

    # Usuario A numa segunda organizacao: preferencia independente da primeira.
    org_id_2 = user_a.post("/api/v1/organizations", json={"name": "Empresa WSP 10-B"}).json()["id"]
    a_second_org = user_a.get(f"/api/v1/organizations/{org_id_2}/workspace-preferences").json()
    assert a_second_org["quick_access"] is None
