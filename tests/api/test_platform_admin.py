"""Painel de Super Admin (RF-001, RF-012) — apps/api/app/modules/platform_admin/.

`is_platform_admin` não é exposto por nenhuma rota pública (não existe
"vire admin sozinho" via API) — os testes promovem o usuário direto no banco
via `db_session`, o mesmo caminho que `app/scripts/grant_platform_admin.py`
usa fora da aplicação.
"""

from app.models.user import User


def _register_login(client, email: str, name: str = "Usuário") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": "SenhaForte123!"})
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})


def _make_platform_admin(db_session, email: str) -> None:
    user = db_session.query(User).filter(User.email == email).one()
    user.is_platform_admin = True
    db_session.commit()


def test_non_admin_gets_403_on_every_platform_endpoint(client):
    _register_login(client, "naoadmin@example.com")

    assert client.get("/api/v1/platform/organizations").status_code == 403
    assert client.get("/api/v1/platform/users").status_code == 403
    create_resp = client.post("/api/v1/platform/users", json={"name": "X", "email": "x@example.com"})
    assert create_resp.status_code == 403


def test_unauthenticated_gets_401(client):
    assert client.get("/api/v1/platform/organizations").status_code == 401


def test_list_organizations_shows_owner_and_member_count(client, db_session):
    _register_login(client, "dono.plataforma1@example.com", "Dona da Empresa")
    org = client.post("/api/v1/organizations", json={"name": "Empresa Vista Pelo Admin"}).json()
    _make_platform_admin(db_session, "dono.plataforma1@example.com")

    resp = client.get("/api/v1/platform/organizations")
    assert resp.status_code == 200
    listed = next(o for o in resp.json() if o["id"] == org["id"])
    assert listed["owner_email"] == "dono.plataforma1@example.com"
    assert listed["member_count"] == 1


def test_create_user_returns_dev_token_and_conflicts_on_duplicate_email(client, db_session):
    _register_login(client, "admin.createuser@example.com")
    _make_platform_admin(db_session, "admin.createuser@example.com")

    resp = client.post(
        "/api/v1/platform/users", json={"name": "Conta Solta", "email": "solta@example.com"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["name"] == "Conta Solta"
    assert body["user"]["organization_count"] == 0
    assert body["dev_token"] is not None

    conflict = client.post(
        "/api/v1/platform/users", json={"name": "Outra", "email": "solta@example.com"}
    )
    assert conflict.status_code == 409


def test_platform_admin_grants_access_to_any_organization_without_membership(client_factory, db_session):
    admin = client_factory()
    owner = client_factory()
    _register_login(admin, "admin.grant@example.com")
    _make_platform_admin(db_session, "admin.grant@example.com")

    _register_login(owner, "owner.grant@example.com")
    org = owner.post("/api/v1/organizations", json={"name": "Empresa Alheia"}).json()

    # O admin NAO tem membership nesta empresa — só o papel global.
    resp = admin.post(
        f"/api/v1/platform/organizations/{org['id']}/memberships",
        json={"email": "novo.funcionario.plataforma@example.com", "role": "ANALYST", "name": "Novo"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["dev_token"] is not None

    listed = admin.get(f"/api/v1/platform/organizations/{org['id']}/memberships").json()
    assert any(m["user_email"] == "novo.funcionario.plataforma@example.com" for m in listed)


def test_platform_admin_can_revoke_even_the_owner(client_factory, db_session):
    admin = client_factory()
    owner = client_factory()
    _register_login(admin, "admin.revokeowner@example.com")
    _make_platform_admin(db_session, "admin.revokeowner@example.com")

    _register_login(owner, "owner.revokedbyadmin@example.com")
    org = owner.post("/api/v1/organizations", json={"name": "Empresa Sera Revogada"}).json()
    owner_membership = next(
        m
        for m in admin.get(f"/api/v1/platform/organizations/{org['id']}/memberships").json()
        if m["user_email"] == "owner.revokedbyadmin@example.com"
    )

    # Um ORGANIZATION_ADMIN comum nunca poderia revogar o Proprietário
    # (RN-009, ver test_memberships.py::test_admin_cannot_revoke_owner) —
    # o Super Admin pode, porque não tem papel dentro da organização.
    resp = admin.delete(
        f"/api/v1/platform/organizations/{org['id']}/memberships/{owner_membership['id']}"
    )
    assert resp.status_code == 204


def test_update_membership_role_via_platform_admin(client_factory, db_session):
    admin = client_factory()
    owner = client_factory()
    _register_login(admin, "admin.rolechange@example.com")
    _make_platform_admin(db_session, "admin.rolechange@example.com")

    _register_login(owner, "owner.rolechange@example.com")
    org = owner.post("/api/v1/organizations", json={"name": "Empresa Papel"}).json()
    invite = owner.post(
        f"/api/v1/organizations/{org['id']}/memberships",
        json={"email": "sobe.de.papel@example.com", "role": "VIEWER", "name": "Sobe"},
    ).json()

    resp = admin.patch(
        f"/api/v1/platform/organizations/{org['id']}/memberships/{invite['id']}",
        json={"role": "ORGANIZATION_ADMIN"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "ORGANIZATION_ADMIN"


def test_deactivate_and_reactivate_user(client, db_session):
    _register_login(client, "admin.deactivate@example.com")
    _make_platform_admin(db_session, "admin.deactivate@example.com")
    created = client.post(
        "/api/v1/platform/users", json={"name": "Sera Desativado", "email": "desativar@example.com"}
    ).json()["user"]

    resp = client.patch(f"/api/v1/platform/users/{created['id']}", json={"is_active": False})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    resp2 = client.patch(f"/api/v1/platform/users/{created['id']}", json={"is_active": True})
    assert resp2.json()["is_active"] is True


def test_grant_and_revoke_platform_admin_of_another_user(client, db_session):
    _register_login(client, "admin.grantsuper@example.com")
    _make_platform_admin(db_session, "admin.grantsuper@example.com")
    created = client.post(
        "/api/v1/platform/users", json={"name": "Vira Admin", "email": "viraadmin@example.com"}
    ).json()["user"]

    grant = client.patch(
        f"/api/v1/platform/users/{created['id']}", json={"is_platform_admin": True}
    )
    assert grant.status_code == 200
    assert grant.json()["is_platform_admin"] is True

    revoke = client.patch(
        f"/api/v1/platform/users/{created['id']}", json={"is_platform_admin": False}
    )
    assert revoke.json()["is_platform_admin"] is False


def test_cannot_remove_own_platform_admin_or_deactivate_self(client, db_session):
    _register_login(client, "admin.selfguard@example.com")
    _make_platform_admin(db_session, "admin.selfguard@example.com")
    me = client.get("/api/v1/auth/me").json()

    resp = client.patch(f"/api/v1/platform/users/{me['id']}", json={"is_platform_admin": False})
    assert resp.status_code == 400

    resp2 = client.patch(f"/api/v1/platform/users/{me['id']}", json={"is_active": False})
    assert resp2.status_code == 400


def test_grant_access_to_nonexistent_organization_is_404(client, db_session):
    _register_login(client, "admin.badorg@example.com")
    _make_platform_admin(db_session, "admin.badorg@example.com")

    resp = client.post(
        "/api/v1/platform/organizations/00000000-0000-0000-0000-000000000000/memberships",
        json={"email": "x@example.com", "role": "VIEWER", "name": "X"},
    )
    assert resp.status_code == 404
