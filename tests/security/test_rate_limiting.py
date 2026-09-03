"""RNF-005 — rate limiting em endpoints sensiveis de autenticacao/conta.

Cobre as 3 dimensoes de chave (IP isolado, conta isolada, IP+conta
combinada — ver app/core/rate_limit.py) e a cobertura expandida a
endpoints que nao tinham nenhum limite antes da auditoria de hardening
(2026-09): /register, /refresh, /password-reset/confirm, /change-password,
/verify-email, convite de membership, criacao administrativa de usuario.
"""

from app.core.rate_limit import (
    change_password_account_rate_limiter,
    login_account_rate_limiter,
    login_ip_rate_limiter,
    login_rate_limiter,
    membership_invite_rate_limiter,
    password_reset_confirm_ip_rate_limiter,
    password_reset_rate_limiter,
    platform_user_create_rate_limiter,
    refresh_ip_rate_limiter,
    register_ip_rate_limiter,
    verify_email_ip_rate_limiter,
)
from app.models.user import User
from app.modules.auth import router as auth_router


def _register_login(client, email: str, name: str = "Ana") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": "SenhaForte123!"})
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})


def test_login_is_rate_limited_after_too_many_attempts(client):
    email = "rate.limit@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )

    responses = [
        client.post("/api/v1/auth/login", json={"email": email, "password": "errada"})
        for _ in range(login_rate_limiter.max_attempts)
    ]
    assert all(r.status_code == 401 for r in responses)

    blocked = client.post("/api/v1/auth/login", json={"email": email, "password": "errada"})
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers
    assert int(blocked.headers["Retry-After"]) > 0


def test_password_reset_request_is_rate_limited_after_too_many_attempts(client):
    email = "rate.limit.reset@example.com"

    responses = [
        client.post("/api/v1/auth/password-reset/request", json={"email": email})
        for _ in range(password_reset_rate_limiter.max_attempts)
    ]
    assert all(r.status_code == 200 for r in responses)

    blocked = client.post("/api/v1/auth/password-reset/request", json={"email": email})
    assert blocked.status_code == 429


def test_password_spraying_from_one_ip_against_many_accounts_is_blocked(client):
    # O achado central da auditoria de hardening: uma chave so combinada
    # (IP+conta) nunca bloqueia isto, porque cada combinacao e nova a cada
    # conta testada. Mesmo IP (o unico que o TestClient reporta), N contas
    # diferentes, mesma senha errada.
    for i in range(login_ip_rate_limiter.max_attempts):
        resp = client.post(
            "/api/v1/auth/login", json={"email": f"spray{i}@example.com", "password": "errada"}
        )
        assert resp.status_code == 401

    blocked = client.post(
        "/api/v1/auth/login", json={"email": "spray-nunca-tentada@example.com", "password": "errada"}
    )
    assert blocked.status_code == 429


def test_credential_stuffing_against_one_account_from_many_ips_is_blocked(client, monkeypatch):
    # O outro lado do mesmo achado: uma conta atacada de muitos IPs
    # diferentes tambem nao esgota nenhuma chave combinada. Simula IPs
    # diferentes a cada chamada (o TestClient sozinho sempre reporta o
    # mesmo host) pra provar que o limiter de CONTA isolada e quem trava.
    fake_ips = iter(f"203.0.113.{i}" for i in range(1, 1000))
    monkeypatch.setattr(auth_router, "get_client_ip", lambda request: next(fake_ips))

    email = "stuffed@example.com"
    client.post("/api/v1/auth/register", json={"name": "Ana", "email": email, "password": "SenhaForte123!"})

    for _ in range(login_account_rate_limiter.max_attempts):
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": "errada"})
        assert resp.status_code == 401

    blocked = client.post("/api/v1/auth/login", json={"email": email, "password": "errada"})
    assert blocked.status_code == 429


def test_register_is_rate_limited(client):
    for i in range(register_ip_rate_limiter.max_attempts):
        resp = client.post(
            "/api/v1/auth/register",
            json={"name": "Ana", "email": f"reg{i}@example.com", "password": "SenhaForte123!"},
        )
        assert resp.status_code == 201

    blocked = client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "reg-bloqueado@example.com", "password": "SenhaForte123!"},
    )
    assert blocked.status_code == 429


def test_refresh_is_rate_limited(client):
    for _ in range(refresh_ip_rate_limiter.max_attempts):
        resp = client.post("/api/v1/auth/refresh")
        assert resp.status_code == 401

    blocked = client.post("/api/v1/auth/refresh")
    assert blocked.status_code == 429


def test_password_reset_confirm_is_rate_limited(client):
    for _ in range(password_reset_confirm_ip_rate_limiter.max_attempts):
        resp = client.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": "invalido", "new_password": "SenhaForte123!"},
        )
        assert resp.status_code == 400

    blocked = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "invalido", "new_password": "SenhaForte123!"},
    )
    assert blocked.status_code == 429


def test_verify_email_is_rate_limited(client):
    for _ in range(verify_email_ip_rate_limiter.max_attempts):
        resp = client.post("/api/v1/auth/verify-email", json={"token": "invalido"})
        assert resp.status_code == 400

    blocked = client.post("/api/v1/auth/verify-email", json={"token": "invalido"})
    assert blocked.status_code == 429


def test_change_password_is_rate_limited_by_account(client):
    email = "changepw@example.com"
    _register_login(client, email)

    for _ in range(change_password_account_rate_limiter.max_attempts):
        resp = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "errada", "new_password": "OutraSenhaForte123!"},
        )
        assert resp.status_code == 401

    blocked = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "errada", "new_password": "OutraSenhaForte123!"},
    )
    assert blocked.status_code == 429


def test_membership_invite_is_rate_limited(client):
    _register_login(client, "convidador@example.com")
    org_id = client.post("/api/v1/organizations", json={"name": "Empresa Convites"}).json()["id"]

    for i in range(membership_invite_rate_limiter.max_attempts):
        resp = client.post(
            f"/api/v1/organizations/{org_id}/memberships",
            json={"email": f"convidado{i}@example.com", "role": "VIEWER", "name": f"Convidado {i}"},
        )
        assert resp.status_code == 201

    blocked = client.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "convidado-bloqueado@example.com", "role": "VIEWER", "name": "Bloqueado"},
    )
    assert blocked.status_code == 429


def test_platform_admin_create_user_is_rate_limited(client, db_session):
    _register_login(client, "superadmin@example.com")
    admin = db_session.query(User).filter(User.email == "superadmin@example.com").one()
    admin.is_platform_admin = True
    db_session.commit()

    for i in range(platform_user_create_rate_limiter.max_attempts):
        resp = client.post(
            "/api/v1/platform/users", json={"name": f"Novo {i}", "email": f"novo{i}@example.com"}
        )
        assert resp.status_code == 201

    blocked = client.post(
        "/api/v1/platform/users", json={"name": "Bloqueado", "email": "novo-bloqueado@example.com"}
    )
    assert blocked.status_code == 429
