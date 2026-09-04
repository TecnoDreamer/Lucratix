"""Criação/revogação de API key por organização (docs/security/API_KEYS.md).

Reaproveita o mesmo mecanismo de token opaco já usado por reset de senha e
verificação de e-mail (`app/core/security.py::hash_opaque_token`) — só o
hash vai para o banco, o valor bruto é devolvido uma única vez, no momento
da criação, e nunca mais pode ser recuperado.
"""

import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.security import hash_opaque_token
from app.models.api_key import ApiKey

# Prefixo fixo e não-secreto, no espírito de chaves da Stripe/GitHub — deixa
# uma chave reconhecível a olho nu (num log, num commit acidental) sem
# revelar nada sobre o segredo em si.
_KEY_PREFIX = "lucratix_"
_PREFIX_DISPLAY_LENGTH = 16


def create_api_key(
    db: Session, *, organization_id: uuid.UUID, created_by_user_id: uuid.UUID, name: str
) -> tuple[ApiKey, str]:
    """Devolve (entidade, valor_bruto). `valor_bruto` só existe aqui — depois
    desta chamada, só o hash sobrevive no banco; não há como recuperá-lo."""
    raw_key = f"{_KEY_PREFIX}{secrets.token_urlsafe(32)}"
    api_key = ApiKey(
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
        name=name,
        key_hash=hash_opaque_token(raw_key),
        key_prefix=raw_key[:_PREFIX_DISPLAY_LENGTH],
    )
    db.add(api_key)
    db.flush()
    return api_key, raw_key


def revoke_api_key(db: Session, api_key: ApiKey) -> None:
    """Idempotente — revogar uma chave já revogada não é erro, mesmo padrão
    de `app.core.sessions.revoke_session`."""
    if api_key.revoked_at is None:
        api_key.revoked_at = datetime.now(UTC)
