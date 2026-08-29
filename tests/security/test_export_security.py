"""Exportação — RNF-002 (isolamento multi-tenant). Mesma garantia dos demais
módulos: organization_id do path é sempre cruzado com a membership ativa do
usuário autenticado (get_organization_context), nunca confiado cru."""


def _register_and_login(client, name: str, email: str, password: str = "SenhaForte123!") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": password})
    client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_user_cannot_export_data_of_another_organization(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    _register_and_login(client_a, "Ana", "exp.sec.a@example.com")
    _register_and_login(client_b, "Bruno", "exp.sec.b@example.com")

    org_a = client_a.post("/api/v1/organizations", json={"name": "Empresa Exp Sec A"}).json()["id"]
    client_a.put(
        f"/api/v1/organizations/{org_a}/financials",
        json={"period": "2026-01-01", "revenue": 999999},
    )
    org_b = client_b.post("/api/v1/organizations", json={"name": "Empresa Exp Sec B"}).json()["id"]

    # Organização B tenta baixar o export usando o proprio org_id no path —
    # nunca deve enxergar o dado da organização A.
    resp = client_b.get(f"/api/v1/organizations/{org_b}/exports/financial_periods", params={"format": "json"})
    assert resp.status_code == 200
    assert resp.json() == []

    # E nem sequer alcança o dado tentando o org_id de A sem ser membro dela.
    resp = client_b.get(f"/api/v1/organizations/{org_a}/exports/financial_periods", params={"format": "json"})
    assert resp.status_code == 404


def test_unauthenticated_export_is_rejected(client_factory):
    client = client_factory()
    resp = client.get(
        f"/api/v1/organizations/{'00000000-0000-0000-0000-000000000000'}/exports/financial_periods",
        params={"format": "csv"},
    )
    assert resp.status_code == 401
