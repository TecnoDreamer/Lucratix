"""RNF-002 — o requisito mais critico do produto (ver docs/security/threat-model.md).

Prova, por teste automatizado, que um usuario da Organizacao A NAO consegue
ler nem alterar dados da Organizacao B, mesmo manipulando o ID diretamente.
"""


def _register_and_login(client, name: str, email: str, password: str = "SenhaForte123!") -> None:
    resp = client.post(
        "/api/v1/auth/register", json={"name": name, "email": email, "password": password}
    )
    assert resp.status_code == 201
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200


def test_user_cannot_read_another_organization_by_id(client_factory):
    client_a = client_factory()
    client_b = client_factory()

    _register_and_login(client_a, "Ana", "ana@example.com")
    _register_and_login(client_b, "Bruno", "bruno@example.com")

    org_x = client_a.post("/api/v1/organizations", json={"name": "Empresa X"}).json()
    org_y = client_b.post("/api/v1/organizations", json={"name": "Empresa Y"}).json()

    resp = client_a.get(f"/api/v1/organizations/{org_y['id']}")
    assert resp.status_code == 404

    resp = client_b.get(f"/api/v1/organizations/{org_x['id']}")
    assert resp.status_code == 404


def test_user_only_lists_own_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()

    _register_and_login(client_a, "Ana", "ana2@example.com")
    _register_and_login(client_b, "Bruno", "bruno2@example.com")

    org_x = client_a.post("/api/v1/organizations", json={"name": "Empresa X2"}).json()
    org_y = client_b.post("/api/v1/organizations", json={"name": "Empresa Y2"}).json()

    listed_a = {o["id"] for o in client_a.get("/api/v1/organizations").json()["items"]}
    listed_b = {o["id"] for o in client_b.get("/api/v1/organizations").json()["items"]}

    assert org_x["id"] in listed_a
    assert org_y["id"] not in listed_a
    assert org_y["id"] in listed_b
    assert org_x["id"] not in listed_b


def test_user_cannot_edit_another_organization(client_factory):
    client_a = client_factory()
    client_b = client_factory()

    _register_and_login(client_a, "Ana", "ana3@example.com")
    _register_and_login(client_b, "Bruno", "bruno3@example.com")

    org_x = client_a.post("/api/v1/organizations", json={"name": "Empresa X3"}).json()

    resp = client_b.patch(f"/api/v1/organizations/{org_x['id']}", json={"name": "Nome Hostil"})
    assert resp.status_code == 404

    # Confirma que o nome nao foi alterado.
    resp = client_a.get(f"/api/v1/organizations/{org_x['id']}")
    assert resp.json()["name"] == "Empresa X3"


def test_user_cannot_read_audit_log_of_another_organization(client_factory):
    client_a = client_factory()
    client_b = client_factory()

    _register_and_login(client_a, "Ana", "ana4@example.com")
    _register_and_login(client_b, "Bruno", "bruno4@example.com")

    org_x = client_a.post("/api/v1/organizations", json={"name": "Empresa X4"}).json()

    resp = client_b.get(f"/api/v1/organizations/{org_x['id']}/audit-logs")
    assert resp.status_code == 404


def test_user_without_membership_cannot_access_any_organization(client_factory):
    client_a = client_factory()
    client_c = client_factory()

    _register_and_login(client_a, "Ana", "ana5@example.com")
    _register_and_login(client_c, "Carla (sem organizacao)", "carla@example.com")

    org_x = client_a.post("/api/v1/organizations", json={"name": "Empresa X5"}).json()

    assert client_c.get("/api/v1/organizations").json()["items"] == []
    assert client_c.get(f"/api/v1/organizations/{org_x['id']}").status_code == 404
