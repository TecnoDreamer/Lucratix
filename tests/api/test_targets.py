"""Metas por KPI/mes — evolucao do Analytics (2026-08-31)."""


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


def test_upsert_target_creates_a_new_record(client):
    org_id = _register_login_and_create_org(client, "tgt1@example.com", "Empresa Alvo 1")

    resp = client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 50000},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["metric"] == "revenue"
    assert body["period"] == "2026-06-01"
    assert body["value"] == 50000


def test_upsert_same_metric_and_period_updates_instead_of_duplicating(client):
    org_id = _register_login_and_create_org(client, "tgt2@example.com", "Empresa Alvo 2")

    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 50000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 60000},
    )

    targets = client.get(f"/api/v1/organizations/{org_id}/targets").json()
    matching = [t for t in targets if t["metric"] == "revenue" and t["period"] == "2026-06-01"]
    assert len(matching) == 1
    assert matching[0]["value"] == 60000


def test_different_metrics_same_period_are_independent_targets(client):
    org_id = _register_login_and_create_org(client, "tgt3@example.com", "Empresa Alvo 3")

    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 50000},
    )
    client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "profit", "period": "2026-06-01", "value": 20000},
    )

    targets = client.get(f"/api/v1/organizations/{org_id}/targets").json()
    assert len(targets) == 2


def test_delete_target(client):
    org_id = _register_login_and_create_org(client, "tgt4@example.com", "Empresa Alvo 4")

    created = client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 50000},
    ).json()

    resp = client.delete(f"/api/v1/organizations/{org_id}/targets/{created['id']}")
    assert resp.status_code == 204

    targets = client.get(f"/api/v1/organizations/{org_id}/targets").json()
    assert targets == []


def test_delete_nonexistent_target_is_404(client):
    org_id = _register_login_and_create_org(client, "tgt5@example.com", "Empresa Alvo 5")

    resp = client.delete(f"/api/v1/organizations/{org_id}/targets/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_invalid_metric_is_rejected(client):
    org_id = _register_login_and_create_org(client, "tgt6@example.com", "Empresa Alvo 6")

    resp = client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "receita_falsa", "period": "2026-06-01", "value": 50000},
    )
    assert resp.status_code == 422


def test_viewer_can_read_but_not_write_targets(client_factory):
    owner = client_factory()
    viewer_client = client_factory()
    _register_and_login(owner, "Ana", "tgt.owner@example.com")
    _register_and_login(viewer_client, "Vitor", "tgt.viewer@example.com")

    org_id = owner.post("/api/v1/organizations", json={"name": "Empresa Alvo Viewer"}).json()["id"]
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "tgt.viewer@example.com", "role": "VIEWER"},
    )
    created = owner.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 50000},
    ).json()

    read_resp = viewer_client.get(f"/api/v1/organizations/{org_id}/targets")
    assert read_resp.status_code == 200

    write_resp = viewer_client.put(
        f"/api/v1/organizations/{org_id}/targets",
        json={"metric": "profit", "period": "2026-06-01", "value": 20000},
    )
    assert write_resp.status_code == 403

    delete_resp = viewer_client.delete(f"/api/v1/organizations/{org_id}/targets/{created['id']}")
    assert delete_resp.status_code == 403


def test_targets_are_isolated_between_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "tgt7a@example.com", "Empresa Alvo 7A")
    _register_login_and_create_org(client_b, "tgt7b@example.com", "Empresa Alvo 7B")

    client_a.put(
        f"/api/v1/organizations/{org_a}/targets",
        json={"metric": "revenue", "period": "2026-06-01", "value": 50000},
    )

    resp = client_b.get(f"/api/v1/organizations/{org_a}/targets")
    assert resp.status_code == 404
