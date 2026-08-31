"""app/core/security.py::generate_opaque_token/hash_opaque_token — o
primitivo de token de uso unico reaproveitado por reset de senha
(PasswordResetToken) e verificacao de e-mail (EmailVerificationToken)."""

from app.core.security import generate_opaque_token, hash_opaque_token


def test_generate_returns_raw_and_matching_hash():
    raw, token_hash = generate_opaque_token()
    assert raw != token_hash
    assert hash_opaque_token(raw) == token_hash


def test_tokens_are_unique_across_calls():
    raw1, _ = generate_opaque_token()
    raw2, _ = generate_opaque_token()
    assert raw1 != raw2


def test_hash_is_deterministic():
    raw, _ = generate_opaque_token()
    assert hash_opaque_token(raw) == hash_opaque_token(raw)
