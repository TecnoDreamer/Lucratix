"""Password hashing and JWT helpers.

Password hashing uses Argon2 (OWASP-recommended default), never reversible.
Tokens are always delivered to the client as HttpOnly cookies — see ADR-0004 —
never read from `localStorage` by any frontend code.
"""

import hashlib
import secrets
import uuid
from dataclasses import dataclass
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


def _create_token(
    subject: str, session_id: uuid.UUID, token_type: TokenType, expires_delta: timedelta
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "sid": str(session_id),
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: uuid.UUID, session_id: uuid.UUID) -> str:
    return _create_token(
        str(user_id),
        session_id,
        TokenType.ACCESS,
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: uuid.UUID, session_id: uuid.UUID) -> str:
    return _create_token(
        str(user_id),
        session_id,
        TokenType.REFRESH,
        timedelta(days=settings.refresh_token_expire_days),
    )


class InvalidTokenError(Exception):
    pass


# Mensagem exibida ao usuario quando a sessao referenciada pelo token existe
# mas foi revogada por um login em outro dispositivo (RN-016) — distinta da
# mensagem generica de token invalido/expirado, para que o front-end (ver
# apps/web/src/lib/api.ts) saiba mostrar a explicacao correta em vez de um
# "sessao expirada" enganoso. O texto e comparado por igualdade exata no
# front-end; qualquer mudanca aqui precisa ser espelhada la.
SESSION_REVOKED_DETAIL = (
    "Sua sessão foi encerrada porque esta conta foi acessada em outro dispositivo."
)


@dataclass(frozen=True)
class TokenPayload:
    user_id: uuid.UUID
    session_id: uuid.UUID


def decode_token(token: str, expected_type: TokenType) -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError("Token invalido ou expirado") from exc

    if payload.get("type") != expected_type.value:
        raise InvalidTokenError("Tipo de token inesperado")

    try:
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])
    except (KeyError, ValueError) as exc:
        raise InvalidTokenError("Token sem sujeito valido") from exc
    return TokenPayload(user_id=user_id, session_id=session_id)


def generate_opaque_token() -> tuple[str, str]:
    """RF-004, RF-001. Retorna (raw_token, token_hash) — usado tanto por
    reset de senha quanto por verificacao de e-mail (tokens de uso unico e
    curta duracao, cada um com sua propria tabela — ver
    app/models/password_reset_token.py e app/models/email_verification_token.py;
    a funcao de geracao e generica, o que muda e so onde o hash e guardado).

    `raw_token` e o valor entregue ao usuario (nunca persistido); `token_hash`
    (SHA-256) e o que fica no banco — um hash rapido e suficiente aqui
    (diferente de senha, ver hash_password/Argon2 acima) porque o token
    ja tem alta entropia (256 bits, gerado por secrets.token_urlsafe) e
    e de uso unico e curta duracao, não sujeito a ataque de forca bruta
    offline do mesmo jeito que uma senha escolhida por humano.
    """
    raw_token = secrets.token_urlsafe(32)
    return raw_token, hash_opaque_token(raw_token)


def hash_opaque_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
