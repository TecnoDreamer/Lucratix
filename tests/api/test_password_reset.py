"""RF-004, RF-005, RN-012 — recuperacao e alteracao de senha."""

from app.core.security import SESSION_REVOKED_DETAIL
from app.models.audit_log import AuditLog
from app.models.user import User


def test_request_reset_for_existing_email_returns_dev_token(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "reset1@example.com", "password": "SenhaForte123!"},
    )
    resp = client.post("/api/v1/auth/password-reset/request", json={"email": "reset1@example.com"})
    assert resp.status_code == 200
    body = resp.json()
    assert "dev_token" in body
    assert body["dev_token"]


def test_request_reset_for_nonexistent_email_has_identical_shape(client):
    existing = client.post(
        "/api/v1/auth/password-reset/request", json={"email": "reset1@example.com"}
    ).json()
    nonexistent = client.post(
        "/api/v1/auth/password-reset/request", json={"email": "never.registered@example.com"}
    ).json()
    assert existing["message"] == nonexistent["message"]
    assert "dev_token" not in nonexistent


def test_confirm_reset_changes_password_and_token_is_single_use(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "reset2@example.com", "password": "SenhaAntiga123!"},
    )
    token = client.post(
        "/api/v1/auth/password-reset/request", json={"email": "reset2@example.com"}
    ).json()["dev_token"]

    confirm = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "SenhaNova123!"},
    )
    assert confirm.status_code == 200

    old_login = client.post(
        "/api/v1/auth/login", json={"email": "reset2@example.com", "password": "SenhaAntiga123!"}
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login", json={"email": "reset2@example.com", "password": "SenhaNova123!"}
    )
    assert new_login.status_code == 200

    reuse = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "OutraSenha123!"},
    )
    assert reuse.status_code == 400


def test_confirm_reset_rejects_weak_password_and_does_not_consume_the_token(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "reset3@example.com", "password": "SenhaAntiga123!"},
    )
    token = client.post(
        "/api/v1/auth/password-reset/request", json={"email": "reset3@example.com"}
    ).json()["dev_token"]

    weak = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "fraca"},
    )
    assert weak.status_code == 400

    # Uma chamada direta a API com senha fraca nunca consome o token —
    # o mesmo link ainda funciona com uma senha forte em seguida.
    strong = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "SenhaForte123!"},
    )
    assert strong.status_code == 200


def test_confirm_reset_revokes_any_active_session(client_factory):
    # Auditoria de hardening (2026-09): se a conta estava comprometida
    # (sessao ativa de um atacante), o reset por e-mail deve encerra-la na
    # hora, em vez de deixa-la valer ate expirar sozinha. `device_a` e a
    # sessao que existia antes do reset (poderia ser o atacante ou so outro
    # dispositivo do proprio dono); `device_b` simula abrir o link de reset
    # (mesmo criterio de "dispositivo diferente" de test_single_active_session.py).
    device_a = client_factory()
    device_b = client_factory()
    email = "reset.revoke@example.com"

    device_a.post(
        "/api/v1/auth/register", json={"name": "Ana", "email": email, "password": "SenhaAntiga123!"}
    )
    device_a.post("/api/v1/auth/login", json={"email": email, "password": "SenhaAntiga123!"})
    assert device_a.get("/api/v1/auth/me").status_code == 200

    token = device_b.post("/api/v1/auth/password-reset/request", json={"email": email}).json()[
        "dev_token"
    ]
    confirm = device_b.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "SenhaNova123!"},
    )
    assert confirm.status_code == 200

    resp = device_a.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["detail"] == SESSION_REVOKED_DETAIL


def test_confirm_reset_records_audit_event_with_the_users_id(client, db_session):
    email = "reset.audit@example.com"
    client.post(
        "/api/v1/auth/register", json={"name": "Ana", "email": email, "password": "SenhaAntiga123!"}
    )
    token = client.post("/api/v1/auth/password-reset/request", json={"email": email}).json()[
        "dev_token"
    ]
    client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "SenhaNova123!"},
    )

    user = db_session.query(User).filter(User.email == email).one()
    events = db_session.query(AuditLog).filter(AuditLog.action == "user.password_reset_completed").all()
    assert len(events) == 1
    assert events[0].entity_id == user.id
    assert events[0].user_id == user.id


def test_confirm_reset_with_invalid_token_is_rejected(client):
    resp = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": "token-que-nunca-existiu", "new_password": "SenhaNova123!"},
    )
    assert resp.status_code == 400


def test_change_password_requires_correct_current_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "changepwd@example.com", "password": "SenhaAntiga123!"},
    )
    client.post(
        "/api/v1/auth/login", json={"email": "changepwd@example.com", "password": "SenhaAntiga123!"}
    )

    wrong = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "errada", "new_password": "SenhaNova123!"},
    )
    assert wrong.status_code == 401

    right = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "SenhaAntiga123!", "new_password": "SenhaNova123!"},
    )
    assert right.status_code == 200


def test_change_password_rejects_weak_new_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "changepwdfraca@example.com", "password": "SenhaAntiga123!"},
    )
    client.post(
        "/api/v1/auth/login",
        json={"email": "changepwdfraca@example.com", "password": "SenhaAntiga123!"},
    )

    resp = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "SenhaAntiga123!", "new_password": "fraca"},
    )
    assert resp.status_code == 400

    # A senha antiga continua valendo — a troca fraca nunca foi aplicada.
    still_works = client.post(
        "/api/v1/auth/login",
        json={"email": "changepwdfraca@example.com", "password": "SenhaAntiga123!"},
    )
    assert still_works.status_code == 200


def test_change_password_requires_authentication(client):
    resp = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "a", "new_password": "SenhaNova123!"},
    )
    assert resp.status_code == 401
