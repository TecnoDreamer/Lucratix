"""GET /api/v1/organizations — busca + paginação server-side (2026-09-01).

Antes devolvia sempre a lista inteira do usuário, sem filtro nenhum —
não escala para centenas de empresas.
"""


def _register_login(client, email: str, name: str = "Ana") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": "SenhaForte123!"})
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})


def test_zero_organizations_returns_empty_page(client):
    _register_login(client, "orglist1@example.com")
    resp = client.get("/api/v1/organizations")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"items": [], "total": 0, "limit": 24, "offset": 0}


def test_pagination_walks_all_rows_without_duplicates_or_gaps(client):
    _register_login(client, "orglist2@example.com")
    for i in range(7):
        client.post("/api/v1/organizations", json={"name": f"Empresa {i:02d}"})

    seen_ids: list[str] = []
    offset = 0
    while True:
        page = client.get(f"/api/v1/organizations?limit=3&offset={offset}").json()
        seen_ids.extend(item["id"] for item in page["items"])
        assert page["total"] == 7
        offset += len(page["items"])
        if offset >= page["total"] or not page["items"]:
            break

    assert len(seen_ids) == 7
    assert len(set(seen_ids)) == 7


def test_same_name_organizations_have_stable_page_boundary_via_id_tiebreak(client):
    _register_login(client, "orglist3@example.com")
    client.post("/api/v1/organizations", json={"name": "Empresa Igual"})
    client.post("/api/v1/organizations", json={"name": "Empresa Igual"})

    page1 = client.get("/api/v1/organizations?limit=1&offset=0").json()
    page2 = client.get("/api/v1/organizations?limit=1&offset=1").json()
    assert page1["items"][0]["id"] != page2["items"][0]["id"]


def test_search_matches_name_case_insensitively(client):
    _register_login(client, "orglist4@example.com")
    client.post("/api/v1/organizations", json={"name": "Café Delivery"})
    client.post("/api/v1/organizations", json={"name": "Outra Coisa"})

    resp = client.get("/api/v1/organizations?search=CAFÉ")
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Café Delivery"


def test_search_matches_trade_name(client):
    _register_login(client, "orglist5@example.com")
    client.post("/api/v1/organizations", json={"name": "Razão Social LTDA", "trade_name": "Nome Fantasia"})

    resp = client.get("/api/v1/organizations?search=fantasia")
    assert resp.json()["total"] == 1


def test_search_percent_and_underscore_are_literal_not_wildcards(client):
    _register_login(client, "orglist6@example.com")
    client.post("/api/v1/organizations", json={"name": "Empresa Normal"})

    # "%" e "_" tem significado especial em LIKE — sem escape, casariam com
    # qualquer nome. Aqui devem se comportar como caracteres literais.
    assert client.get("/api/v1/organizations?search=%25").json()["total"] == 0
    assert client.get("/api/v1/organizations?search=_").json()["total"] == 0


def test_invalid_limit_and_offset_are_rejected(client):
    _register_login(client, "orglist7@example.com")
    assert client.get("/api/v1/organizations?limit=0").status_code == 422
    assert client.get("/api/v1/organizations?limit=101").status_code == 422
    assert client.get("/api/v1/organizations?offset=-1").status_code == 422


def test_status_filter_active_frozen_all(client):
    _register_login(client, "orglist8@example.com")
    org_id = client.post("/api/v1/organizations", json={"name": "Empresa Filtro"}).json()["id"]
    client.post(f"/api/v1/organizations/{org_id}/freeze", json={})

    active = client.get("/api/v1/organizations?status=active").json()
    frozen = client.get("/api/v1/organizations?status=frozen").json()
    everything = client.get("/api/v1/organizations?status=all").json()
    assert active["total"] == 0
    assert frozen["total"] == 1
    assert everything["total"] == 1


def test_tenant_isolation_holds_under_any_search(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    _register_login(client_a, "orglist9a@example.com")
    _register_login(client_b, "orglist9b@example.com")
    client_a.post("/api/v1/organizations", json={"name": "Empresa Secreta A"})

    resp = client_b.get("/api/v1/organizations?search=Secreta")
    assert resp.json() == {"items": [], "total": 0, "limit": 24, "offset": 0}


def test_summary_with_organization_id_filter_only_returns_requested_ids(client):
    _register_login(client, "orglist10@example.com")
    org_a = client.post("/api/v1/organizations", json={"name": "Empresa A"}).json()["id"]
    client.post("/api/v1/organizations", json={"name": "Empresa B"})

    resp = client.get(f"/api/v1/organizations/summary?period=2026-06-01&organization_id={org_a}")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["organization_id"] == org_a


def test_summary_organization_id_of_another_tenant_is_silently_absent(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    _register_login(client_a, "orglist11a@example.com")
    _register_login(client_b, "orglist11b@example.com")
    org_a = client_a.post("/api/v1/organizations", json={"name": "Empresa A"}).json()["id"]

    resp = client_b.get(f"/api/v1/organizations/summary?period=2026-06-01&organization_id={org_a}")
    assert resp.status_code == 200
    assert resp.json() == []


def test_summary_without_ids_behaves_as_before(client):
    _register_login(client, "orglist12@example.com")
    client.post("/api/v1/organizations", json={"name": "Empresa Sem Filtro"})
    resp = client.get("/api/v1/organizations/summary?period=2026-06-01")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
