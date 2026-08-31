"""RN-009, RN-010 e requisitos de docs/security/security-testing.md."""


def _register_and_login(client, name: str, email: str, password: str = "SenhaForte123!") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": password})
    client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_unauthenticated_request_to_org_scoped_route_is_401(client_factory):
    client = client_factory()
    resp = client.get("/api/v1/organizations")
    # /organizations exige apenas autenticacao (nao um organization_id de path).
    assert resp.status_code == 401


def test_viewer_cannot_write_to_organization(client_factory):
    owner = client_factory()
    viewer_client = client_factory()

    _register_and_login(owner, "Ana", "owner.viewer@example.com")
    _register_and_login(viewer_client, "Vitor", "viewer@example.com")

    org = owner.post("/api/v1/organizations", json={"name": "Empresa RBAC"}).json()
    owner.post(
        f"/api/v1/organizations/{org['id']}/memberships",
        json={"email": "viewer@example.com", "role": "VIEWER"},
    )

    resp = viewer_client.patch(f"/api/v1/organizations/{org['id']}", json={"name": "Alterado"})
    assert resp.status_code == 403


def test_viewer_access_split_between_dashboard_and_analytics_reports(client_factory):
    """Decisao confirmada com o usuario, tela por tela (2026-08-27): VIEWER
    continua vendo o Dashboard (RN-010 original), mas Analytics (executivo e
    marketing) e o Relatorio exigem ANALYST+."""
    owner = client_factory()
    viewer_client = client_factory()

    _register_and_login(owner, "Ana", "owner.viewersplit@example.com")
    _register_and_login(viewer_client, "Vitor", "viewersplit@example.com")

    org = owner.post("/api/v1/organizations", json={"name": "Empresa Split RBAC"}).json()
    owner.post(
        f"/api/v1/organizations/{org['id']}/memberships",
        json={"email": "viewersplit@example.com", "role": "VIEWER"},
    )

    dashboard_resp = viewer_client.get(
        f"/api/v1/organizations/{org['id']}/dashboard", params={"period": "2026-08-01"}
    )
    assert dashboard_resp.status_code == 200

    executive_resp = viewer_client.get(
        f"/api/v1/organizations/{org['id']}/analytics/executive",
        params={"date_from": "2026-08-01", "date_to": "2026-08-31"},
    )
    assert executive_resp.status_code == 403

    marketing_resp = viewer_client.get(
        f"/api/v1/organizations/{org['id']}/analytics/marketing",
        params={"date_from": "2026-08-01", "date_to": "2026-08-31"},
    )
    assert marketing_resp.status_code == 403

    series_resp = viewer_client.get(
        f"/api/v1/organizations/{org['id']}/analytics/executive/series",
        params={"date_from": "2026-08-01", "date_to": "2026-08-31"},
    )
    assert series_resp.status_code == 403

    targets_resp = viewer_client.get(
        f"/api/v1/organizations/{org['id']}/analytics/executive/targets",
        params={"date_from": "2026-08-01", "date_to": "2026-08-31"},
    )
    assert targets_resp.status_code == 403

    by_channel_resp = viewer_client.get(
        f"/api/v1/organizations/{org['id']}/analytics/marketing/by-channel",
        params={"date_from": "2026-08-01", "date_to": "2026-08-31"},
    )
    assert by_channel_resp.status_code == 403

    correlation_resp = viewer_client.get(
        f"/api/v1/organizations/{org['id']}/analytics/executive/correlation",
        params={"date_from": "2026-08-01", "date_to": "2026-08-31", "metric_x": "revenue", "metric_y": "cac"},
    )
    assert correlation_resp.status_code == 403

    report_resp = viewer_client.get(
        f"/api/v1/organizations/{org['id']}/reports/basic", params={"period": "2026-08-01"}
    )
    assert report_resp.status_code == 403


def test_analyst_cannot_promote_self_to_owner(client_factory):
    owner = client_factory()
    analyst_client = client_factory()

    _register_and_login(owner, "Ana", "owner.analyst@example.com")
    _register_and_login(analyst_client, "Alan", "analyst@example.com")

    org = owner.post("/api/v1/organizations", json={"name": "Empresa RBAC 2"}).json()
    invite = owner.post(
        f"/api/v1/organizations/{org['id']}/memberships",
        json={"email": "analyst@example.com", "role": "ANALYST"},
    ).json()

    # Analyst nao tem permissao nem para chamar o endpoint (exige ORGANIZATION_ADMIN+).
    resp = analyst_client.patch(
        f"/api/v1/organizations/{org['id']}/memberships/{invite['id']}",
        json={"role": "ORGANIZATION_OWNER"},
    )
    assert resp.status_code == 403


def test_admin_cannot_assign_role_above_own(client_factory):
    owner = client_factory()
    admin_client = client_factory()

    _register_and_login(owner, "Ana", "owner.admin@example.com")
    _register_and_login(admin_client, "Adriana", "admin@example.com")

    org = owner.post("/api/v1/organizations", json={"name": "Empresa RBAC 3"}).json()
    admin_membership = owner.post(
        f"/api/v1/organizations/{org['id']}/memberships",
        json={"email": "admin@example.com", "role": "ORGANIZATION_ADMIN"},
    ).json()

    # ORGANIZATION_ADMIN tenta se autopromover a ORGANIZATION_OWNER (RN-009).
    resp = admin_client.patch(
        f"/api/v1/organizations/{org['id']}/memberships/{admin_membership['id']}",
        json={"role": "ORGANIZATION_OWNER"},
    )
    assert resp.status_code == 403


def test_access_token_cookie_is_httponly_and_samesite(client_factory):
    client = client_factory()
    _register_and_login(client, "Ana", "cookieflags@example.com")
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "cookieflags@example.com", "password": "SenhaForte123!"},
    )
    set_cookie_headers = resp.headers.get_list("set-cookie")
    access_cookie = next(h for h in set_cookie_headers if h.startswith("access_token="))
    assert "HttpOnly" in access_cookie
    assert "samesite=lax" in access_cookie.lower()


def test_malformed_payload_returns_422_not_500(client_factory):
    client = client_factory()
    resp = client.post("/api/v1/auth/register", json={"name": "Ana", "email": "nao-e-email"})
    assert resp.status_code == 422
