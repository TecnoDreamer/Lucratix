"""GET /organizations/summary — indicadores rapidos por empresa para a lista
"Suas empresas" (prompt de redesign de UX de 2026-08-27, PARTE 1), num unico
request para todas as organizacoes do usuario em vez de uma chamada por card.
"""


def _register_and_login(client, email: str) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})


def test_summary_traz_indicadores_de_cada_empresa_do_usuario(client):
    _register_and_login(client, "summary1@example.com")
    org_a = client.post("/api/v1/organizations", json={"name": "Empresa A"}).json()
    org_b = client.post("/api/v1/organizations", json={"name": "Empresa B"}).json()

    client.put(
        f"/api/v1/organizations/{org_a['id']}/financials",
        json={"period": "2026-08-01", "revenue": 42000, "marketing_investment": 5000},
    )
    client.put(
        f"/api/v1/organizations/{org_a['id']}/funnel-snapshots",
        json={"period": "2026-08-01", "leads": 200, "customers": 25},
    )

    resp = client.get("/api/v1/organizations/summary", params={"period": "2026-08-01"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 2

    by_org = {row["organization_id"]: row for row in body}
    row_a = by_org[org_a["id"]]
    assert row_a["revenue"]["value"] == 42000
    assert row_a["revenue"]["is_applicable"] is True
    assert row_a["leads"] == 200
    assert row_a["cac"]["value"] == 5000 / 25
    assert row_a["conversion_rate"]["value"] == 25 / 200

    row_b = by_org[org_b["id"]]
    assert row_b["revenue"]["is_applicable"] is False
    assert row_b["revenue"]["value"] is None
    assert row_b["leads"] is None


def test_summary_nao_vaza_dado_entre_organizacoes_de_usuarios_diferentes(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    _register_and_login(client_a, "summary2a@example.com")
    _register_and_login(client_b, "summary2b@example.com")

    org_a1 = client_a.post("/api/v1/organizations", json={"name": "Empresa Isolada A1"}).json()
    org_a2 = client_a.post("/api/v1/organizations", json={"name": "Empresa Isolada A2"}).json()
    org_b1 = client_b.post("/api/v1/organizations", json={"name": "Empresa Isolada B1"}).json()

    resp_a = client_a.get("/api/v1/organizations/summary", params={"period": "2026-08-01"})
    assert resp_a.status_code == 200
    org_ids_a = {row["organization_id"] for row in resp_a.json()}
    assert org_ids_a == {org_a1["id"], org_a2["id"]}

    resp_b = client_b.get("/api/v1/organizations/summary", params={"period": "2026-08-01"})
    assert resp_b.status_code == 200
    org_ids_b = {row["organization_id"] for row in resp_b.json()}
    assert org_ids_b == {org_b1["id"]}


def test_summary_com_usuario_sem_empresas_retorna_lista_vazia(client):
    _register_and_login(client, "summary3@example.com")

    resp = client.get("/api/v1/organizations/summary", params={"period": "2026-08-01"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_summary_exige_autenticacao(client):
    resp = client.get("/api/v1/organizations/summary", params={"period": "2026-08-01"})
    assert resp.status_code == 401
