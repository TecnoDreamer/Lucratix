"""Password hashing and JWT helpers.

Password hashing uses Argon2 (OWASP-recommended default), never reversible.
Tokens are always delivered to the client as HttpOnly cookies — see ADR-0004 —
never read from `localStorage` by any frontend code.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

settings = get_settings()
_hasher = PasswordHasher()


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


def hash_password(plain_password: str) -> str:
    return _hasher.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        # Nunca deixa uma senha malformada/hash corrompido derrubar o login com 500;
        # trata como credencial invalida (RN-012 - sem enumeracao / sem vazamento de detalhe).
        return False


def _create_token(subject: str, token_type: TokenType, expires_delta: timedelta) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: uuid.UUID) -> str:
    return _create_token(
        str(user_id),
        TokenType.ACCESS,
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: uuid.UUID) -> str:
    return _create_token(
        str(user_id),
        TokenType.REFRESH,
        timedelta(days=settings.refresh_token_expire_days),
    )


class InvalidTokenError(Exception):
    pass


def decode_token(token: str, expected_type: TokenType) -> uuid.UUID:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError("Token invalido ou expirado") from exc

    if payload.get("type") != expected_type.value:
        raise InvalidTokenError("Tipo de token inesperado")

    try:
        return uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise InvalidTokenError("Token sem sujeito valido") from exc


def generate_password_reset_token() -> tuple[str, str]:
    """RF-004. Retorna (raw_token, token_hash).

    `raw_token` e o valor entregue ao usuario (nunca persistido); `token_hash`
    (SHA-256) e o que fica no banco — um hash rapido e suficiente aqui
    (diferente de senha, ver hash_password/Argon2 acima) porque o token
    ja tem alta entropia (256 bits, gerado por secrets.token_urlsafe) e
    e de uso unico e curta duracao, não sujeito a ataque de forca bruta
    offline do mesmo jeito que uma senha escolhida por humano.
    """
    raw_token = secrets.token_urlsafe(32)
    return raw_token, hash_password_reset_token(raw_token)


def hash_password_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
