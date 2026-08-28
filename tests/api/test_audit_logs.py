"""GET /organizations/{id}/audit-logs — paginação (auditoria de banco,
2026-08-27): antes retornava sempre os 100 mais recentes, sem forma de
alcançar entradas mais antigas.
"""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_audit_logs_retorna_envelope_com_total_limit_offset(client):
    org_id = _register_login_and_create_org(client, "audit1@example.com", "Empresa Audit 1")

    resp = client.get(f"/api/v1/organizations/{org_id}/audit-logs")
    assert resp.status_code == 200
    body = resp.json()

    # A propria criacao da organizacao ja gera um registro (organization.created).
    assert body["total"] >= 1
    assert body["limit"] == 50
    assert body["offset"] == 0
    assert len(body["items"]) == body["total"]
    assert body["items"][0]["action"] == "organization.created"


def test_audit_logs_pagina_corretamente_com_limit_e_offset(client):
    org_id = _register_login_and_create_org(client, "audit2@example.com", "Empresa Audit 2")

    # Gera mais eventos de auditoria (organization.updated) para ter o que paginar.
    for i in range(4):
        client.patch(f"/api/v1/organizations/{org_id}", json={"notes": f"nota {i}"})

    total_resp = client.get(f"/api/v1/organizations/{org_id}/audit-logs")
    total = total_resp.json()["total"]
    assert total == 5  # 1 organization.created + 4 organization.updated

    page1 = client.get(f"/api/v1/organizations/{org_id}/audit-logs", params={"limit": 2, "offset": 0})
    assert page1.status_code == 200
    body1 = page1.json()
    assert len(body1["items"]) == 2
    assert body1["total"] == 5
    assert body1["limit"] == 2
    assert body1["offset"] == 0

    page2 = client.get(f"/api/v1/organizations/{org_id}/audit-logs", params={"limit": 2, "offset": 2})
    body2 = page2.json()
    assert len(body2["items"]) == 2

    page3 = client.get(f"/api/v1/organizations/{org_id}/audit-logs", params={"limit": 2, "offset": 4})
    body3 = page3.json()
    assert len(body3["items"]) == 1  # ultima pagina, so sobra 1

    # Nenhum id se repete entre paginas (paginacao real, nao a mesma janela de sempre).
    ids_page1 = {item["id"] for item in body1["items"]}
    ids_page2 = {item["id"] for item in body2["items"]}
    ids_page3 = {item["id"] for item in body3["items"]}
    assert ids_page1.isdisjoint(ids_page2)
    assert ids_page2.isdisjoint(ids_page3)
    assert len(ids_page1 | ids_page2 | ids_page3) == 5


def test_audit_logs_rejeita_limit_fora_do_intervalo_permitido(client):
    org_id = _register_login_and_create_org(client, "audit3@example.com", "Empresa Audit 3")

    assert client.get(
        f"/api/v1/organizations/{org_id}/audit-logs", params={"limit": 0}
    ).status_code == 422
    assert client.get(
        f"/api/v1/organizations/{org_id}/audit-logs", params={"limit": 201}
    ).status_code == 422
    assert client.get(
        f"/api/v1/organizations/{org_id}/audit-logs", params={"offset": -1}
    ).status_code == 422
