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


def test_refresh_issues_new_access_token(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "refresh.ok@example.com", "password": "SenhaForte123!"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "refresh.ok@example.com", "password": "SenhaForte123!"},
    )
    old_access_token = client.cookies.get("access_token")

    resp = client.post("/api/v1/auth/refresh")

    assert resp.status_code == 200
    assert "access_token" in resp.cookies
    assert resp.cookies["access_token"] != old_access_token
    assert client.get("/api/v1/auth/me").status_code == 200


def test_refresh_without_cookie_is_unauthorized(client):
    resp = client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


def test_refresh_with_access_token_instead_of_refresh_is_rejected(client):
    # Um access_token nao deve ser aceito no lugar do refresh_token (tipos
    # de token nao sao intercambiaveis, ver `TokenType` em core/security.py).
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "refresh.wrongtype@example.com", "password": "SenhaForte123!"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "refresh.wrongtype@example.com", "password": "SenhaForte123!"},
    )
    access_token = client.cookies.get("access_token")

    resp = client.post("/api/v1/auth/refresh", cookies={"refresh_token": access_token})
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


def test_me_locale_is_null_before_ever_choosing_one(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "locale.default@example.com", "password": "SenhaForte123!"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "locale.default@example.com", "password": "SenhaForte123!"},
    )
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["locale"] is None


def test_update_locale_persists_and_is_reflected_on_me(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "locale.update@example.com", "password": "SenhaForte123!"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "locale.update@example.com", "password": "SenhaForte123!"},
    )

    resp = client.patch("/api/v1/auth/locale", json={"locale": "en"})
    assert resp.status_code == 200
    assert resp.json()["locale"] == "en"
    assert client.get("/api/v1/auth/me").json()["locale"] == "en"


def test_update_locale_rejects_unsupported_value(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "locale.invalid@example.com", "password": "SenhaForte123!"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "locale.invalid@example.com", "password": "SenhaForte123!"},
    )

    resp = client.patch("/api/v1/auth/locale", json={"locale": "fr"})
    assert resp.status_code == 422


def test_update_locale_requires_authentication(client):
    resp = client.patch("/api/v1/auth/locale", json={"locale": "en"})
    assert resp.status_code == 401
    assert client.get("/api/v1/auth/me").status_code == 401
