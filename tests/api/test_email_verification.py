"""RF-001 — verificação de e-mail. Sem RESEND_API_KEY configurada nos testes
(mesmo estado do ambiente de CI/dev), `send_email` sempre devolve False —
todo fluxo aqui exercita o caminho `dev_token`, o mesmo que já existia para
password-reset. Verificar e-mail NUNCA bloqueia login (decisão documentada
em docs/security/AUTHENTICATION.md)."""

from datetime import UTC, datetime, timedelta

from app.core.security import hash_opaque_token
from app.models.audit_log import AuditLog
from app.models.email_verification_token import EmailVerificationToken
from app.models.user import User


def _register(client, email: str, name: str = "Ana") -> dict:
    return client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "SenhaForte123!"},
    ).json()


def test_register_returns_dev_token_and_email_starts_unverified(client):
    body = _register(client, "verificacao1@example.com")
    assert body["dev_token"] is not None

    client.post(
        "/api/v1/auth/login", json={"email": "verificacao1@example.com", "password": "SenhaForte123!"}
    )
    me = client.get("/api/v1/auth/me").json()
    assert me["email_verified"] is False


def test_verify_email_with_valid_token_marks_verified(client):
    body = _register(client, "verificacao2@example.com")

    confirm = client.post("/api/v1/auth/verify-email", json={"token": body["dev_token"]})
    assert confirm.status_code == 200

    client.post(
        "/api/v1/auth/login", json={"email": "verificacao2@example.com", "password": "SenhaForte123!"}
    )
    me = client.get("/api/v1/auth/me").json()
    assert me["email_verified"] is True


def test_verify_email_records_audit_event_with_the_users_id(client, db_session):
    email = "verificacao.audit@example.com"
    body = _register(client, email)

    client.post("/api/v1/auth/verify-email", json={"token": body["dev_token"]})

    user = db_session.query(User).filter(User.email == email).one()
    events = db_session.query(AuditLog).filter(AuditLog.action == "user.email_verified").all()
    assert len(events) == 1
    assert events[0].entity_id == user.id
    assert events[0].user_id == user.id


def test_verify_email_does_not_block_login_before_verifying(client):
    """A conta funciona normalmente mesmo sem verificar — decisão deliberada
    (nunca bloqueante), não travar o próprio fluxo de "admin cria conta"."""
    _register(client, "naoverificado@example.com")

    login = client.post(
        "/api/v1/auth/login", json={"email": "naoverificado@example.com", "password": "SenhaForte123!"}
    )
    assert login.status_code == 200

    orgs = client.get("/api/v1/organizations")
    assert orgs.status_code == 200


def test_verify_email_with_invalid_token_is_400(client):
    resp = client.post("/api/v1/auth/verify-email", json={"token": "token-que-nao-existe"})
    assert resp.status_code == 400


def test_verify_email_token_is_single_use(client):
    body = _register(client, "usounico@example.com")
    token = body["dev_token"]

    first = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert first.status_code == 200

    second = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert second.status_code == 400


def test_verify_email_with_expired_token_is_rejected(client, db_session):
    # Teste de integracao (secao 23 do prompt de hardening): "token expirado
    # falha" — distinto de "token invalido" (formato inexistente, ja
    # coberto acima). Mesma tecnica de test_password_reset.py:
    # envelhecer o `expires_at` direto no banco, sem mockar relogio.
    body = _register(client, "verificacao-expirada@example.com")
    token = body["dev_token"]

    record = (
        db_session.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token_hash == hash_opaque_token(token))
        .one()
    )
    record.expires_at = datetime.now(UTC) - timedelta(hours=1)
    db_session.commit()

    resp = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert resp.status_code == 400


def test_resend_verification_returns_generic_message_for_unknown_email(client):
    resp = client.post("/api/v1/auth/resend-verification", json={"email": "nao.existe@example.com"})
    assert resp.status_code == 200
    assert "dev_token" not in resp.json()


def test_resend_verification_issues_new_token_for_unverified_account(client):
    _register(client, "reenviar@example.com")

    resp = client.post("/api/v1/auth/resend-verification", json={"email": "reenviar@example.com"})
    assert resp.status_code == 200
    assert resp.json()["dev_token"] is not None


def test_resend_verification_is_generic_once_already_verified(client):
    body = _register(client, "javerificado@example.com")
    client.post("/api/v1/auth/verify-email", json={"token": body["dev_token"]})

    resp = client.post("/api/v1/auth/resend-verification", json={"email": "javerificado@example.com"})
    assert resp.status_code == 200
    # RN-012: nao revela que a conta ja existe/ja foi verificada — resposta
    # generica identica a e-mail inexistente, sem dev_token.
    assert "dev_token" not in resp.json()


def test_resend_verification_is_rate_limited(client):
    for _ in range(5):
        client.post("/api/v1/auth/resend-verification", json={"email": "limite@example.com"})

    resp = client.post("/api/v1/auth/resend-verification", json={"email": "limite@example.com"})
    assert resp.status_code == 429
