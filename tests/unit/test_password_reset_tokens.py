from app.core.security import generate_password_reset_token, hash_password_reset_token


def test_generate_returns_raw_and_matching_hash():
    raw, token_hash = generate_password_reset_token()
    assert raw != token_hash
    assert hash_password_reset_token(raw) == token_hash


def test_tokens_are_unique_across_calls():
    raw1, _ = generate_password_reset_token()
    raw2, _ = generate_password_reset_token()
    assert raw1 != raw2


def test_hash_is_deterministic():
    raw, _ = generate_password_reset_token()
    assert hash_password_reset_token(raw) == hash_password_reset_token(raw)
