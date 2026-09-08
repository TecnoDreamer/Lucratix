"""Persistencia de personalizacao de graficos por usuario+organizacao+chart_key
(PR3 do redesign do Funil, 2026-09-08)."""


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


def _url(org_id: str, chart_key: str) -> str:
    return f"/api/v1/organizations/{org_id}/chart-preferences/{chart_key}"


FUNNEL_PREFS = {"chart_type": "bars", "show_values": True, "density": "compact"}
CONVERSION_PREFS = {"show_values": False, "density": "comfortable"}


def test_get_with_no_saved_row_returns_null_preferences_never_404(client):
    org_id = _register_login_and_create_org(client, "cp1@example.com", "Empresa CP 1")

    resp = client.get(_url(org_id, "funnel-stages"))
    assert resp.status_code == 200
    body = resp.json()
    assert body["organization_id"] == org_id
    assert body["chart_key"] == "funnel-stages"
    assert body["preferences"] is None
    assert body["updated_at"] is None


def test_get_with_unknown_chart_key_never_404s(client):
    org_id = _register_login_and_create_org(client, "cp2@example.com", "Empresa CP 2")

    resp = client.get(_url(org_id, "grafico-inventado"))
    assert resp.status_code == 200
    assert resp.json()["preferences"] is None


def test_patch_saves_preferences(client):
    org_id = _register_login_and_create_org(client, "cp3@example.com", "Empresa CP 3")

    resp = client.patch(_url(org_id, "funnel-stages"), json={"preferences": FUNNEL_PREFS})
    assert resp.status_code == 200
    assert resp.json()["preferences"] == FUNNEL_PREFS

    read_back = client.get(_url(org_id, "funnel-stages")).json()
    assert read_back["preferences"] == FUNNEL_PREFS
    assert read_back["updated_at"] is not None


def test_patch_twice_upserts_single_row_last_write_wins(client):
    org_id = _register_login_and_create_org(client, "cp4@example.com", "Empresa CP 4")

    client.patch(_url(org_id, "funnel-stages"), json={"preferences": FUNNEL_PREFS})
    resp = client.patch(
        _url(org_id, "funnel-stages"),
        json={"preferences": {"chart_type": "funnel", "show_values": False, "density": "comfortable"}},
    )
    assert resp.status_code == 200
    assert resp.json()["preferences"] == {
        "chart_type": "funnel",
        "show_values": False,
        "density": "comfortable",
    }


def test_patch_null_restores_default(client):
    org_id = _register_login_and_create_org(client, "cp5@example.com", "Empresa CP 5")

    client.patch(_url(org_id, "funnel-stages"), json={"preferences": FUNNEL_PREFS})
    resp = client.patch(_url(org_id, "funnel-stages"), json={"preferences": None})
    assert resp.status_code == 200
    assert resp.json()["preferences"] is None


def test_patch_empty_body_is_a_noop(client):
    org_id = _register_login_and_create_org(client, "cp6@example.com", "Empresa CP 6")

    client.patch(_url(org_id, "funnel-stages"), json={"preferences": FUNNEL_PREFS})
    resp = client.patch(_url(org_id, "funnel-stages"), json={})
    assert resp.status_code == 200
    assert resp.json()["preferences"] == FUNNEL_PREFS


def test_patch_unknown_chart_key_is_rejected(client):
    org_id = _register_login_and_create_org(client, "cp7@example.com", "Empresa CP 7")

    resp = client.patch(_url(org_id, "grafico-inventado"), json={"preferences": {}})
    assert resp.status_code == 404


def test_patch_body_not_matching_chart_key_schema_is_rejected(client):
    org_id = _register_login_and_create_org(client, "cp8@example.com", "Empresa CP 8")

    # stage-conversion nao tem campo chart_type, e density fora do enum e invalido.
    resp = client.patch(
        _url(org_id, "stage-conversion"),
        json={"preferences": {"show_values": True, "density": "densidade-inventada"}},
    )
    assert resp.status_code == 422


def test_patch_never_persists_extra_unknown_fields(client):
    org_id = _register_login_and_create_org(client, "cp9@example.com", "Empresa CP 9")

    resp = client.patch(
        _url(org_id, "stage-conversion"),
        json={"preferences": {**CONVERSION_PREFS, "campo_arbitrario": "nao deveria ir pro banco"}},
    )
    assert resp.status_code == 200
    assert resp.json()["preferences"] == CONVERSION_PREFS


def test_viewer_can_read_and_write_own_preference(client_factory):
    owner = client_factory()
    viewer_client = client_factory()
    _register_and_login(owner, "Ana", "cp.owner@example.com")
    _register_and_login(viewer_client, "Vitor", "cp.viewer@example.com")

    org_id = owner.post("/api/v1/organizations", json={"name": "Empresa CP Viewer"}).json()["id"]
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "cp.viewer@example.com", "role": "VIEWER"},
    )

    read_resp = viewer_client.get(_url(org_id, "funnel-stages"))
    assert read_resp.status_code == 200

    write_resp = viewer_client.patch(_url(org_id, "funnel-stages"), json={"preferences": FUNNEL_PREFS})
    assert write_resp.status_code == 200


def test_non_member_gets_404_on_both_verbs(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "cp10a@example.com", "Empresa CP 10A")
    _register_login_and_create_org(client_b, "cp10b@example.com", "Empresa CP 10B")

    assert client_b.get(_url(org_a, "funnel-stages")).status_code == 404
    assert (
        client_b.patch(_url(org_a, "funnel-stages"), json={"preferences": None}).status_code == 404
    )


def test_unauthenticated_gets_401(client):
    resp = client.get(_url("00000000-0000-0000-0000-000000000000", "funnel-stages"))
    assert resp.status_code == 401


def test_preferences_are_isolated_per_user_and_per_organization(client_factory):
    user_a = client_factory()
    user_b = client_factory()
    _register_and_login(user_a, "Ana", "cp11a@example.com")
    _register_and_login(user_b, "Bia", "cp11b@example.com")

    org_id = user_a.post("/api/v1/organizations", json={"name": "Empresa CP 11"}).json()["id"]
    user_a.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "cp11b@example.com", "role": "VIEWER"},
    )

    user_a.patch(_url(org_id, "funnel-stages"), json={"preferences": FUNNEL_PREFS})

    # Usuario B, mesma organizacao: nunca configurou, deve ver o proprio
    # estado nulo, nao o que o usuario A salvou.
    b_read = user_b.get(_url(org_id, "funnel-stages")).json()
    assert b_read["preferences"] is None

    # Usuario A numa segunda organizacao: preferencia independente da primeira.
    org_id_2 = user_a.post("/api/v1/organizations", json={"name": "Empresa CP 11-B"}).json()["id"]
    a_second_org = user_a.get(_url(org_id_2, "funnel-stages")).json()
    assert a_second_org["preferences"] is None


def test_preferences_are_isolated_per_chart_key(client):
    org_id = _register_login_and_create_org(client, "cp12@example.com", "Empresa CP 12")

    client.patch(_url(org_id, "funnel-stages"), json={"preferences": FUNNEL_PREFS})

    # Mesmo usuario, mesma organizacao, outro grafico: nunca configurou este,
    # nao deve ver o que foi salvo pro "funnel-stages".
    conversion_read = client.get(_url(org_id, "stage-conversion")).json()
    assert conversion_read["preferences"] is None

    client.patch(_url(org_id, "stage-conversion"), json={"preferences": CONVERSION_PREFS})

    funnel_read = client.get(_url(org_id, "funnel-stages")).json()
    assert funnel_read["preferences"] == FUNNEL_PREFS
    conversion_read_2 = client.get(_url(org_id, "stage-conversion")).json()
    assert conversion_read_2["preferences"] == CONVERSION_PREFS
