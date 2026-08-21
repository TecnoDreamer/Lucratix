"""RF-001, RF-002, RF-003 — cadastro, login e logout."""


def test_register_creates_user_without_leaking_password(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "ana.auth@example.com", "password": "SenhaForte123!"},
    )
    assert resp.status_code == 201
    assert "password" not in resp.text
    assert "SenhaForte123!" not in resp.text


def test_register_duplicate_email_returns_generic_message(client):
    payload = {"name": "Ana", "email": "duplicada@example.com", "password": "SenhaForte123!"}
    first = client.post("/api/v1/auth/register", json=payload)
    second = client.post("/api/v1/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 201
    # RN-012: resposta identica, sem confirmar que o e-mail ja existia.
    assert first.json()["message"] == second.json()["message"]


def test_login_with_correct_credentials_sets_cookies(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "login.ok@example.com", "password": "SenhaForte123!"},
    )
    resp = client.post(
        "/api/v1/auth/login", json={"email": "login.ok@example.com", "password": "SenhaForte123!"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies


def test_login_with_wrong_password_is_generic_and_unauthorized(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "login.bad@example.com", "password": "SenhaForte123!"},
    )
    resp = client.post(
        "/api/v1/auth/login", json={"email": "login.bad@example.com", "password": "errada"}
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Credenciais invalidas"


def test_login_with_nonexistent_email_returns_same_generic_error(client):
    resp_wrong_password = None
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "existe@example.com", "password": "SenhaForte123!"},
    )
    resp_wrong_password = client.post(
        "/api/v1/auth/login", json={"email": "existe@example.com", "password": "errada"}
    )
    resp_nonexistent = client.post(
        "/api/v1/auth/login", json={"email": "nao.existe@example.com", "password": "qualquer"}
    )
    assert resp_wrong_password.status_code == resp_nonexistent.status_code == 401
    assert resp_wrong_password.json()["detail"] == resp_nonexistent.json()["detail"]


def test_me_requires_authentication(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_logout_clears_session(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "logout@example.com", "password": "SenhaForte123!"},
    )
    client.post(
        "/api/v1/auth/login", json={"email": "logout@example.com", "password": "SenhaForte123!"}
    )
    assert client.get("/api/v1/auth/me").status_code == 200

    resp = client.post("/api/v1/auth/logout")
    assert resp.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
