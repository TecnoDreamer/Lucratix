import uuid

import pytest

from app.core.security import (
    InvalidTokenError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_hash_password_never_returns_plain_text():
    password = "SenhaForte123!"
    hashed = hash_password(password)
    assert hashed != password
    assert password not in hashed


def test_verify_password_accepts_correct_password():
    password = "SenhaForte123!"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True


def test_verify_password_rejects_wrong_password():
    hashed = hash_password("SenhaForte123!")
    assert verify_password("outra-senha", hashed) is False


def test_verify_password_rejects_malformed_hash_without_raising():
    assert verify_password("qualquer", "hash-corrompido-nao-argon2") is False


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    assert decode_token(token, TokenType.ACCESS) == user_id


def test_refresh_token_rejected_as_access_token():
    user_id = uuid.uuid4()
    refresh = create_refresh_token(user_id)
    with pytest.raises(InvalidTokenError):
        decode_token(refresh, TokenType.ACCESS)


def test_garbage_token_is_rejected():
    with pytest.raises(InvalidTokenError):
        decode_token("nao-e-um-jwt-valido", TokenType.ACCESS)
