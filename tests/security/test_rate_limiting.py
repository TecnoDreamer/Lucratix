"""RNF-005 — rate limiting no login."""

from app.core.rate_limit import login_rate_limiter


def test_login_is_rate_limited_after_too_many_attempts(client):
    email = "rate.limit@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )

    # Garante estado limpo mesmo se outro teste usou a mesma chave (TestClient
    # usa sempre o mesmo host "testclient").
    login_rate_limiter.reset(f"testclient:{email}")

    responses = [
        client.post("/api/v1/auth/login", json={"email": email, "password": "errada"})
        for _ in range(login_rate_limiter.max_attempts)
    ]
    assert all(r.status_code == 401 for r in responses)

    blocked = client.post("/api/v1/auth/login", json={"email": email, "password": "errada"})
    assert blocked.status_code == 429

    login_rate_limiter.reset(f"testclient:{email}")
