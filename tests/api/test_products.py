"""RF-015, RF-016, RN-014 — produtos/servicos."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_create_product_computes_margin(client):
    org_id = _register_login_and_create_org(client, "product1@example.com", "Empresa Produto 1")

    resp = client.post(
        f"/api/v1/organizations/{org_id}/products",
        json={"name": "Consultoria Mensal", "price": 1000, "cost": 400},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["margin"] == 0.6
    assert body["active"] is True


def test_product_without_price_has_no_applicable_margin(client):
    org_id = _register_login_and_create_org(client, "product2@example.com", "Empresa Produto 2")

    resp = client.post(f"/api/v1/organizations/{org_id}/products", json={"name": "Sem preco"})
    body = resp.json()
    assert body["margin"] is None  # RN-003: nao aplicavel, nunca 0/erro


def test_inactivating_product_keeps_it_in_history(client):
    org_id = _register_login_and_create_org(client, "product3@example.com", "Empresa Produto 3")

    product = client.post(
        f"/api/v1/organizations/{org_id}/products", json={"name": "Produto X", "price": 100, "cost": 50}
    ).json()

    resp = client.patch(
        f"/api/v1/organizations/{org_id}/products/{product['id']}", json={"active": False}
    )
    assert resp.status_code == 200
    assert resp.json()["active"] is False

    all_products = client.get(f"/api/v1/organizations/{org_id}/products").json()
    assert any(p["id"] == product["id"] for p in all_products)  # RN-014: nao some do historico

    active_only = client.get(
        f"/api/v1/organizations/{org_id}/products", params={"include_inactive": False}
    ).json()
    assert not any(p["id"] == product["id"] for p in active_only)
