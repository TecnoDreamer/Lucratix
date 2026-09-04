import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.api_key import ApiKey


def list_by_organization(db: Session, organization_id: uuid.UUID) -> list[ApiKey]:
    """Todas as chaves da organização, ativas ou revogadas — a UI mostra as
    duas (com o estado visível), pelo mesmo motivo de nunca hard-deletar:
    uma chave revogada continua sendo um fato histórico relevante (quem
    criou, quando, até quando esteve ativa)."""
    return (
        db.query(ApiKey)
        .filter(ApiKey.organization_id == organization_id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )


def get_by_id(db: Session, organization_id: uuid.UUID, api_key_id: uuid.UUID) -> ApiKey | None:
    return (
        db.query(ApiKey)
        .filter(ApiKey.id == api_key_id, ApiKey.organization_id == organization_id)
        .one_or_none()
    )


def get_active_by_hash(db: Session, key_hash: str) -> ApiKey | None:
    """Usada só pela autenticação (app/core/api_key_auth.py) — nunca
    devolve uma chave revogada, então o chamador não precisa checar
    `revoked_at` de novo."""
    return (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash, ApiKey.revoked_at.is_(None))
        .one_or_none()
    )


def touch_last_used(db: Session, api_key: ApiKey) -> None:
    api_key.last_used_at = datetime.now(UTC)
