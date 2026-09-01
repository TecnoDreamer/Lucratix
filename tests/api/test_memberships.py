"""RF-001, RF-012, RN-009 — convite/gestão de membros de uma organização.

Cobre especificamente o que mudou nesta rodada: convite cria conta na hora
quando o e-mail ainda não existe (sem exigir cadastro prévio), e revogação
de acesso (antes não existia nenhuma rota de remover membership)."""

import re


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def test_invite_with_existing_user_still_works_and_lists_user_name_email(client):
    org_id = _register_login_and_create_org(client, "owner.inviteexisting@example.com", "Empresa Convite 1")
    client.post(
        "/api/v1/auth/register",
        json={"name": "Bruno", "email": "bruno.existing@example.com", "password": "SenhaForte123!"},
    )

    resp = client.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "bruno.existing@example.com", "role": "ANALYST"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user_name"] == "Bruno"
    assert body["user_email"] == "bruno.existing@example.com"
    assert body["dev_token"] is None  # usuario ja existia, nenhum token novo

    listed = client.get(f"/api/v1/organizations/{org_id}/memberships").json()
    assert any(m["user_email"] == "bruno.existing@example.com" for m in listed)


def test_invite_with_unknown_email_requires_name(client):
    org_id = _register_login_and_create_org(client, "owner.needname@example.com", "Empresa Convite 2")

    resp = client.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "novo.semnome@example.com", "role": "VIEWER"},
    )
    assert resp.status_code == 400
    assert "nome" in resp.json()["detail"].lower()


def test_invite_with_unknown_email_and_name_creates_account_and_full_flow_works(client_factory):
    owner = client_factory()
    org_id = _register_login_and_create_org(owner, "owner.createsaccount@example.com", "Empresa Convite 3")

    resp = owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "funcionario.novo@example.com", "role": "ANALYST", "name": "Funcionário Novo"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user_name"] == "Funcionário Novo"
    assert body["role"] == "ANALYST"
    assert body["dev_token"] is not None  # conta nova, fora de producao (ambiente de teste)

    # Ponta a ponta: o token devolvido é o MESMO fluxo de "esqueci minha
    # senha" (RF-001) — nenhuma rota nova, nenhuma senha em texto puro.
    new_employee = client_factory()
    confirm = new_employee.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": body["dev_token"], "new_password": "SenhaDoFuncionario123!"},
    )
    assert confirm.status_code == 200

    login = new_employee.post(
        "/api/v1/auth/login",
        json={"email": "funcionario.novo@example.com", "password": "SenhaDoFuncionario123!"},
    )
    assert login.status_code == 200

    orgs = new_employee.get("/api/v1/organizations").json()["items"]
    assert any(o["id"] == org_id and o["my_role"] == "ANALYST" for o in orgs)


def test_invite_same_email_twice_is_conflict(client):
    org_id = _register_login_and_create_org(client, "owner.dupe@example.com", "Empresa Convite 4")
    client.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "duplicado@example.com", "role": "VIEWER", "name": "Duplicado"},
    )
    resp = client.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "duplicado@example.com", "role": "ANALYST"},
    )
    assert resp.status_code == 409


def test_revoke_membership_removes_access(client_factory):
    owner = client_factory()
    org_id = _register_login_and_create_org(owner, "owner.revoke@example.com", "Empresa Revoke 1")
    invite = owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "revogado@example.com", "role": "VIEWER", "name": "Vai Sair"},
    ).json()

    resp = owner.delete(f"/api/v1/organizations/{org_id}/memberships/{invite['id']}")
    assert resp.status_code == 204

    listed = owner.get(f"/api/v1/organizations/{org_id}/memberships").json()
    assert all(m["id"] != invite["id"] for m in listed)


def test_cannot_revoke_own_membership(client):
    org_id = _register_login_and_create_org(client, "owner.selfrevoke@example.com", "Empresa Revoke 2")
    memberships = client.get(f"/api/v1/organizations/{org_id}/memberships").json()
    own = next(m for m in memberships if m["user_email"] == "owner.selfrevoke@example.com")

    resp = client.delete(f"/api/v1/organizations/{org_id}/memberships/{own['id']}")
    assert resp.status_code == 400


def test_admin_cannot_revoke_owner(client_factory):
    owner = client_factory()
    admin_client = client_factory()
    org_id = _register_login_and_create_org(owner, "owner.revokeguard@example.com", "Empresa Revoke 3")

    admin_client.post(
        "/api/v1/auth/register",
        json={"name": "Admin", "email": "admin.revokeguard@example.com", "password": "SenhaForte123!"},
    )
    admin_client.post(
        "/api/v1/auth/login",
        json={"email": "admin.revokeguard@example.com", "password": "SenhaForte123!"},
    )
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "admin.revokeguard@example.com", "role": "ORGANIZATION_ADMIN"},
    )

    owner_membership = next(
        m
        for m in owner.get(f"/api/v1/organizations/{org_id}/memberships").json()
        if m["user_email"] == "owner.revokeguard@example.com"
    )
    resp = admin_client.delete(
        f"/api/v1/organizations/{org_id}/memberships/{owner_membership['id']}"
    )
    assert resp.status_code == 403


def test_dev_token_looks_like_a_reasonable_url_safe_token(client):
    org_id = _register_login_and_create_org(client, "owner.tokenshape@example.com", "Empresa Convite 5")
    body = client.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "formato.token@example.com", "role": "VIEWER", "name": "Formato"},
    ).json()
    assert re.fullmatch(r"[A-Za-z0-9_-]+", body["dev_token"])
