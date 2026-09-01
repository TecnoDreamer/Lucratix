"""Ciclo de vida de organização: congelar (encerrar) / reativar — nunca
apagar (2026-09-01).

O teste mais importante deste arquivo é `test_frozen_organization_blocks_write_endpoints`:
um caso parametrizado por endpoint de escrita com escopo de organização,
confirmando 409 numa organização congelada. Cobre o único ponto de
aplicação do bloqueio (`core/deps.py::_ensure_organization_writable`) — se
um módulo futuro esquecer de passar por `get_organization_context`
(direto ou via `require_role`), esse teste pega.
"""

import pytest

from app.models.user import User

TEST_PASSWORD = "SenhaForte123!"


def _register_login(client, email: str, name: str = "Ana", password: str = TEST_PASSWORD) -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": password})
    client.post("/api/v1/auth/login", json={"email": email, "password": password})


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    _register_login(client, email)
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _make_platform_admin(db_session, email: str) -> None:
    user = db_session.query(User).filter(User.email == email).one()
    user.is_platform_admin = True
    db_session.commit()


# --- Papel mínimo para congelar/reativar ------------------------------------


def test_freeze_role_matrix(client_factory):
    owner = client_factory()
    org_id = _register_login_and_create_org(owner, "lifecycle.owner@example.com", "Empresa Papeis")

    for role, expect_status in [("VIEWER", 403), ("ANALYST", 403), ("ORGANIZATION_ADMIN", 200)]:
        member_client = client_factory()
        email = f"lifecycle.{role.lower()}@example.com"
        _register_login(member_client, email)
        owner.post(f"/api/v1/organizations/{org_id}/memberships", json={"email": email, "role": role})

        resp = member_client.post(f"/api/v1/organizations/{org_id}/freeze", json={})
        assert resp.status_code == expect_status, role
        if resp.status_code == 200:
            owner.post(f"/api/v1/organizations/{org_id}/reactivate")


def test_non_member_gets_404_on_freeze(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_id = _register_login_and_create_org(client_a, "lifecycle.a@example.com", "Empresa A")
    _register_login(client_b, "lifecycle.b@example.com")

    resp = client_b.post(f"/api/v1/organizations/{org_id}/freeze", json={})
    assert resp.status_code == 404


# --- Congelar / reativar em si ------------------------------------------


def test_freeze_sets_status_and_audit_fields(client):
    org_id = _register_login_and_create_org(client, "lifecycle1@example.com", "Empresa Freeze")

    resp = client.post(f"/api/v1/organizations/{org_id}/freeze", json={"reason": "Contrato encerrado"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "frozen"
    assert body["closed_at"] is not None
    assert body["closure_reason"] == "Contrato encerrado"

    audit = client.get(f"/api/v1/organizations/{org_id}/audit-logs").json()
    actions = [item["action"] for item in audit["items"]]
    assert "organization.frozen" in actions


def test_freeze_twice_is_409_and_does_not_change_closed_at(client):
    org_id = _register_login_and_create_org(client, "lifecycle2@example.com", "Empresa Dupla")
    first = client.post(f"/api/v1/organizations/{org_id}/freeze", json={}).json()

    second = client.post(f"/api/v1/organizations/{org_id}/freeze", json={})
    assert second.status_code == 409

    current = client.get(f"/api/v1/organizations/{org_id}").json()
    assert current["closed_at"] == first["closed_at"]


def test_reactivate_an_already_active_organization_is_409(client):
    org_id = _register_login_and_create_org(client, "lifecycle3@example.com", "Empresa Ativa")
    resp = client.post(f"/api/v1/organizations/{org_id}/reactivate")
    assert resp.status_code == 409


def test_reactivate_clears_fields_same_id_no_duplication_writes_work_again(client):
    org_id = _register_login_and_create_org(client, "lifecycle4@example.com", "Empresa Reativa")
    client.post(f"/api/v1/organizations/{org_id}/freeze", json={"reason": "Motivo qualquer"})

    resp = client.post(f"/api/v1/organizations/{org_id}/reactivate")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == org_id
    assert body["status"] == "active"
    assert body["closed_at"] is None
    assert body["closure_reason"] is None

    write_resp = client.patch(f"/api/v1/organizations/{org_id}", json={"segment": "Varejo"})
    assert write_resp.status_code == 200

    all_orgs = client.get("/api/v1/organizations?status=all").json()
    assert all_orgs["total"] == 1


def test_freezing_does_not_delete_any_data(client):
    org_id = _register_login_and_create_org(client, "lifecycle5@example.com", "Empresa Preserva")
    client.post(
        f"/api/v1/organizations/{org_id}/products", json={"name": "Produto X", "price": 100, "cost": 40}
    )
    client.post(f"/api/v1/organizations/{org_id}/baselines", json={"revenue": 1000})

    client.post(f"/api/v1/organizations/{org_id}/freeze", json={})

    products = client.get(f"/api/v1/organizations/{org_id}/products").json()
    baselines = client.get(f"/api/v1/organizations/{org_id}/baselines").json()
    assert len(products) == 1
    assert len(baselines) == 1


def test_deep_link_to_frozen_organization_is_200_not_404(client):
    org_id = _register_login_and_create_org(client, "lifecycle6@example.com", "Empresa Deep Link")
    client.post(f"/api/v1/organizations/{org_id}/freeze", json={})

    resp = client.get(f"/api/v1/organizations/{org_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "frozen"


# --- Bloqueio de escrita: o teste mais importante deste arquivo -------------

_EXPERIMENT_PAYLOAD = {
    "hypothesis": "H",
    "page_or_process": "P",
    "primary_metric": "conversion_rate",
    "start_date": "2026-06-01",
}

_WRITE_ENDPOINTS = [
    ("put", "/financials", {"period": "2026-06-01", "revenue": 1000}),
    ("put", "/funnel-snapshots", {"period": "2026-06-01", "impressions": 10}),
    ("post", "/products", {"name": "P", "price": 10, "cost": 5}),
    ("post", "/baselines", {"revenue": 1000}),
    ("post", "/marketing-channels", {"name": "Canal", "type": "paid"}),
    ("put", "/targets", {"metric": "revenue", "period": "2026-06-01", "value": 1}),
    ("post", "/experiments", _EXPERIMENT_PAYLOAD),
    ("patch", "", {"segment": "Novo"}),
]


@pytest.mark.parametrize("method,suffix,payload", _WRITE_ENDPOINTS)
def test_frozen_organization_blocks_write_endpoints(client, method, suffix, payload):
    slug = suffix.strip("/").replace("/", ".") or "patch"
    org_id = _register_login_and_create_org(client, f"lifecycle.write.{slug}@example.com", "Empresa Bloqueio")
    client.post(f"/api/v1/organizations/{org_id}/freeze", json={})

    url = f"/api/v1/organizations/{org_id}{suffix}"
    resp = getattr(client, method)(url, json=payload)
    message = f"{method.upper()} {url} deveria ser bloqueado, veio {resp.status_code}: {resp.text}"
    assert resp.status_code == 409, message


_READ_ENDPOINTS = [
    "",
    "/dashboard?period=2026-06-01",
    "/products",
    "/financials",
    "/audit-logs",
]


@pytest.mark.parametrize("suffix", _READ_ENDPOINTS)
def test_frozen_organization_still_allows_reads(client, suffix):
    slug = suffix.strip("/").replace("/", ".").replace("?", ".").replace("=", ".") or "root"
    org_id = _register_login_and_create_org(client, f"lifecycle.read.{slug}@example.com", "Empresa Leitura")
    client.post(f"/api/v1/organizations/{org_id}/freeze", json={})

    resp = client.get(f"/api/v1/organizations/{org_id}{suffix}")
    message = f"GET {suffix} deveria continuar liberado, veio {resp.status_code}: {resp.text}"
    assert resp.status_code == 200, message


def test_workspace_preferences_patch_still_works_on_frozen_organization(client):
    org_id = _register_login_and_create_org(client, "lifecycle7@example.com", "Empresa Preferencias")
    client.post(f"/api/v1/organizations/{org_id}/freeze", json={})

    resp = client.patch(
        f"/api/v1/organizations/{org_id}/workspace-preferences",
        json={"quick_access": [{"id": "analytics", "enabled": True}]},
    )
    assert resp.status_code == 200


def test_freeze_and_reactivate_can_be_done_via_platform_admin_membership_still_required(
    client_factory, db_session
):
    """Congelar/reativar sao restritos a ORGANIZATION_ADMIN+ com membership —
    ao contrario do logo, nao existe caminho de Super Admin sem membership
    (decisao deliberada: ciclo de vida e' decisao do tenant, nao da
    plataforma)."""
    owner = client_factory()
    platform_admin_client = client_factory()
    org_id = _register_login_and_create_org(owner, "lifecycle8.owner@example.com", "Empresa Admin Plataforma")
    _register_login(platform_admin_client, "lifecycle8.admin@example.com")
    _make_platform_admin(db_session, "lifecycle8.admin@example.com")

    resp = platform_admin_client.post(f"/api/v1/organizations/{org_id}/freeze", json={})
    assert resp.status_code == 404
