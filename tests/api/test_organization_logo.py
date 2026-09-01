"""POST/DELETE /api/v1/organizations/{id}/logo — upload de logotipo via
Cloudinary. `upload_organization_logo`/`destroy_organization_logo` são
monkeypatchados no módulo do ROUTER (onde o nome foi importado), não no
módulo `core.storage` — o router já capturou a referência original na
importação."""

from app.models.user import User
from app.modules.organizations import router as organizations_router

_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20


def _register_login(client, email: str, name: str = "Ana") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": "SenhaForte123!"})
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    _register_login(client, email)
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _make_platform_admin(db_session, email: str) -> None:
    user = db_session.query(User).filter(User.email == email).one()
    user.is_platform_admin = True
    db_session.commit()


def _upload(client, org_id: str, filename: str = "logo.png", content: bytes = _PNG_BYTES):
    return client.post(
        f"/api/v1/organizations/{org_id}/logo",
        files={"file": (filename, content, "image/png")},
    )


def test_unauthenticated_gets_401(client):
    resp = _upload(client, "00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401


def test_role_matrix_viewer_and_analyst_get_403(client_factory, monkeypatch):
    monkeypatch.setattr(
        organizations_router, "upload_organization_logo", lambda **kwargs: "https://res.cloudinary.com/x.png"
    )
    owner = client_factory()
    org_id = _register_login_and_create_org(owner, "logo.owner@example.com", "Empresa Logo Papeis")

    for role in ["VIEWER", "ANALYST"]:
        member = client_factory()
        email = f"logo.{role.lower()}@example.com"
        _register_login(member, email)
        owner.post(f"/api/v1/organizations/{org_id}/memberships", json={"email": email, "role": role})
        assert _upload(member, org_id).status_code == 403


def test_organization_admin_can_upload_and_logo_url_is_persisted(client, monkeypatch):
    monkeypatch.setattr(
        organizations_router,
        "upload_organization_logo",
        lambda **kwargs: "https://res.cloudinary.com/demo/logo.png",
    )
    org_id = _register_login_and_create_org(client, "logo1@example.com", "Empresa Logo 1")

    resp = _upload(client, org_id)
    assert resp.status_code == 200
    assert resp.json()["logo_url"] == "https://res.cloudinary.com/demo/logo.png"

    fetched = client.get(f"/api/v1/organizations/{org_id}").json()
    assert fetched["logo_url"] == "https://res.cloudinary.com/demo/logo.png"


def test_non_member_non_platform_admin_gets_404(client_factory, monkeypatch):
    monkeypatch.setattr(
        organizations_router, "upload_organization_logo", lambda **kwargs: "https://res.cloudinary.com/x.png"
    )
    client_a = client_factory()
    client_b = client_factory()
    org_id = _register_login_and_create_org(client_a, "logo2a@example.com", "Empresa Logo 2")
    _register_login(client_b, "logo2b@example.com")

    assert _upload(client_b, org_id).status_code == 404


def test_platform_admin_without_membership_can_upload_and_audit_is_marked(
    client_factory, db_session, monkeypatch
):
    monkeypatch.setattr(
        organizations_router,
        "upload_organization_logo",
        lambda **kwargs: "https://res.cloudinary.com/demo/admin-logo.png",
    )
    owner = client_factory()
    admin_client = client_factory()
    org_id = _register_login_and_create_org(owner, "logo3.owner@example.com", "Empresa Logo 3")
    _register_login(admin_client, "logo3.admin@example.com")
    _make_platform_admin(db_session, "logo3.admin@example.com")

    resp = _upload(admin_client, org_id)
    assert resp.status_code == 200
    assert resp.json()["logo_url"] == "https://res.cloudinary.com/demo/admin-logo.png"

    audit = owner.get(f"/api/v1/organizations/{org_id}/audit-logs").json()
    actions = [item["action"] for item in audit["items"]]
    assert "organization.logo_updated_by_platform_admin" in actions


def test_invalid_image_content_is_400_and_does_not_call_storage(client, monkeypatch):
    called = []
    monkeypatch.setattr(
        organizations_router, "upload_organization_logo", lambda **kwargs: called.append(1) or "x"
    )
    org_id = _register_login_and_create_org(client, "logo4@example.com", "Empresa Logo 4")

    resp = client.post(
        f"/api/v1/organizations/{org_id}/logo",
        files={"file": ("logo.png", b"nao sou uma imagem", "image/png")},
    )
    assert resp.status_code == 400
    assert not called


def test_storage_not_configured_returns_503_and_does_not_persist_logo_url(client, monkeypatch):
    from app.core.storage import StorageNotConfiguredError

    def _raise(**kwargs):
        raise StorageNotConfiguredError()

    monkeypatch.setattr(organizations_router, "upload_organization_logo", _raise)
    org_id = _register_login_and_create_org(client, "logo5@example.com", "Empresa Logo 5")

    resp = _upload(client, org_id)
    assert resp.status_code == 503
    assert client.get(f"/api/v1/organizations/{org_id}").json()["logo_url"] is None


def test_storage_error_returns_502_and_does_not_persist_partial_logo_url(client, monkeypatch):
    from app.core.storage import StorageError

    def _raise(**kwargs):
        raise StorageError("falha simulada")

    monkeypatch.setattr(organizations_router, "upload_organization_logo", _raise)
    org_id = _register_login_and_create_org(client, "logo6@example.com", "Empresa Logo 6")

    resp = _upload(client, org_id)
    assert resp.status_code == 502
    assert client.get(f"/api/v1/organizations/{org_id}").json()["logo_url"] is None


def test_replace_overwrites_logo_url(client, monkeypatch):
    urls = iter(["https://res.cloudinary.com/first.png", "https://res.cloudinary.com/second.png"])
    monkeypatch.setattr(organizations_router, "upload_organization_logo", lambda **kwargs: next(urls))
    org_id = _register_login_and_create_org(client, "logo7@example.com", "Empresa Logo 7")

    _upload(client, org_id)
    resp = _upload(client, org_id)
    assert resp.json()["logo_url"] == "https://res.cloudinary.com/second.png"


def test_remove_clears_logo_url_and_falls_back(client, monkeypatch):
    monkeypatch.setattr(
        organizations_router, "upload_organization_logo", lambda **kwargs: "https://res.cloudinary.com/x.png"
    )
    monkeypatch.setattr(organizations_router, "destroy_organization_logo", lambda **kwargs: True)
    org_id = _register_login_and_create_org(client, "logo8@example.com", "Empresa Logo 8")
    _upload(client, org_id)

    resp = client.delete(f"/api/v1/organizations/{org_id}/logo")
    assert resp.status_code == 200
    assert resp.json()["logo_url"] is None


def test_remove_with_no_logo_is_a_noop_200(client, monkeypatch):
    destroy_called = []
    monkeypatch.setattr(
        organizations_router, "destroy_organization_logo", lambda **kwargs: destroy_called.append(1) or True
    )
    org_id = _register_login_and_create_org(client, "logo9@example.com", "Empresa Logo 9")

    resp = client.delete(f"/api/v1/organizations/{org_id}/logo")
    assert resp.status_code == 200
    assert not destroy_called


def test_frozen_organization_blocks_logo_upload_and_removal(client, monkeypatch):
    monkeypatch.setattr(
        organizations_router, "upload_organization_logo", lambda **kwargs: "https://res.cloudinary.com/x.png"
    )
    org_id = _register_login_and_create_org(client, "logo10@example.com", "Empresa Logo Congelada")
    client.post(f"/api/v1/organizations/{org_id}/freeze", json={})

    assert _upload(client, org_id).status_code == 409
    assert client.delete(f"/api/v1/organizations/{org_id}/logo").status_code == 409


def test_rate_limit_after_many_attempts(client, monkeypatch):
    from app.core.rate_limit import logo_upload_rate_limiter

    monkeypatch.setattr(
        organizations_router, "upload_organization_logo", lambda **kwargs: "https://res.cloudinary.com/x.png"
    )
    org_id = _register_login_and_create_org(client, "logo11@example.com", "Empresa Logo Rate Limit")

    last_status = None
    for _ in range(logo_upload_rate_limiter.max_attempts + 1):
        last_status = _upload(client, org_id).status_code
    assert last_status == 429
