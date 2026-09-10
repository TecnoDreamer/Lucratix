"""RN-016 — login em um novo dispositivo encerra a sessao do dispositivo anterior.

`client_factory` cria TestClients com cookie jars independentes contra o
mesmo banco/transacao de teste, simulando dois dispositivos/navegadores
diferentes autenticando a mesma conta (mesmo padrao ja usado em
test_multi_tenant_isolation.py).
"""

from app.core.security import SESSION_REVOKED_DETAIL
from app.models.session import Session as UserSession
from app.models.user import User

_EMAIL = "sessao.unica@example.com"
_PASSWORD = "SenhaForte123!"


def _register(client) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": _EMAIL, "password": _PASSWORD},
    )
    assert resp.status_code == 201


def _login(client) -> None:
    resp = client.post("/api/v1/auth/login", json={"email": _EMAIL, "password": _PASSWORD})
    assert resp.status_code == 200


def test_login_on_second_device_revokes_first_devices_session(client_factory):
    device_a = client_factory()
    device_b = client_factory()

    _register(device_a)
    _login(device_a)
    assert device_a.get("/api/v1/auth/me").status_code == 200

    _login(device_b)

    resp = device_a.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["detail"] == SESSION_REVOKED_DETAIL

    assert device_b.get("/api/v1/auth/me").status_code == 200


def test_refresh_on_revoked_session_is_rejected_with_friendly_message(client_factory):
    device_a = client_factory()
    device_b = client_factory()

    _register(device_a)
    _login(device_a)
    _login(device_b)

    resp = device_a.post("/api/v1/auth/refresh")
    assert resp.status_code == 401
    assert resp.json()["detail"] == SESSION_REVOKED_DETAIL


def test_logout_revokes_session_immediately(client_factory):
    device_a = client_factory()

    _register(device_a)
    _login(device_a)
    assert device_a.get("/api/v1/auth/me").status_code == 200
    stale_access_token = device_a.cookies.get("access_token")

    resp = device_a.post("/api/v1/auth/logout")
    assert resp.status_code == 204

    # O access_token ainda nao expirou (15 min), mas a sessao ja foi
    # revogada no servidor pelo logout — nao deve continuar valendo.
    resp = device_a.get("/api/v1/auth/me", cookies={"access_token": stale_access_token})
    assert resp.status_code == 401
    assert resp.json()["detail"] == SESSION_REVOKED_DETAIL


def test_login_records_ip_and_user_agent_on_the_session(client, db_session):
    # Auditoria de hardening (2026-09): forense de incidente — "de onde veio
    # esta sessao?" — nunca usado em nenhuma decisao de autorizacao.
    email = "sessao.metadado@example.com"
    client.post(
        "/api/v1/auth/register", json={"name": "Ana", "email": email, "password": _PASSWORD}
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": _PASSWORD},
        headers={"User-Agent": "TestClient-Hardening/1.0"},
    )

    user = db_session.query(User).filter(User.email == email).one()
    session = (
        db_session.query(UserSession)
        .filter(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .one()
    )
    assert session.ip_address == "testclient"
    assert session.user_agent == "TestClient-Hardening/1.0"


def test_second_login_after_first_logout_is_a_fresh_session_not_flagged_as_revoked(
    client_factory,
):
    device_a = client_factory()

    _register(device_a)
    _login(device_a)
    device_a.post("/api/v1/auth/logout")

    resp = device_a.post("/api/v1/auth/login", json={"email": _EMAIL, "password": _PASSWORD})
    assert resp.status_code == 200
    assert device_a.get("/api/v1/auth/me").status_code == 200
