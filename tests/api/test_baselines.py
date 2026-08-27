"""RF-013, RF-014, RN-002 — baseline versionado (append-only)."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_create_baseline_and_read_it_back(client):
    org_id = _register_login_and_create_org(client, "baseline1@example.com", "Empresa Baseline 1")

    resp = client.post(
        f"/api/v1/organizations/{org_id}/baselines",
        json={"revenue": 50000, "profit": 10000, "cac": 200},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["revenue"] == 50000
    assert body["conversion_rate"] is None  # ausente, nao zero (RN-004)

    current = client.get(f"/api/v1/organizations/{org_id}/baselines/current").json()
    assert current["id"] == body["id"]


def test_second_baseline_does_not_overwrite_the_first(client):
    org_id = _register_login_and_create_org(client, "baseline2@example.com", "Empresa Baseline 2")

    first = client.post(
        f"/api/v1/organizations/{org_id}/baselines", json={"revenue": 10000}
    ).json()
    second = client.post(
        f"/api/v1/organizations/{org_id}/baselines", json={"revenue": 20000}
    ).json()

    assert first["id"] != second["id"]

    history = client.get(f"/api/v1/organizations/{org_id}/baselines").json()
    ids = {b["id"] for b in history}
    assert first["id"] in ids and second["id"] in ids

    current = client.get(f"/api/v1/organizations/{org_id}/baselines/current").json()
    assert current["id"] == second["id"]
    assert current["revenue"] == 20000

    # O primeiro baseline continua consultavel, intacto (RN-002).
    first_still_there = next(b for b in history if b["id"] == first["id"])
    assert first_still_there["revenue"] == 10000


def test_baseline_of_one_organization_is_not_visible_from_another(client_factory):
    client_a = client_factory()
    client_b = client_factory()

    org_a = _register_login_and_create_org(client_a, "baseline.a@example.com", "Empresa A")
    # client_b precisa existir e estar autenticado; o id da org dele nao e usado.
    _org_b = _register_login_and_create_org(client_b, "baseline.b@example.com", "Empresa B")

    client_a.post(f"/api/v1/organizations/{org_a}/baselines", json={"revenue": 1000})

    resp = client_b.get(f"/api/v1/organizations/{org_a}/baselines")
    assert resp.status_code == 404
