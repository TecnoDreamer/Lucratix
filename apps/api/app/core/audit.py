import uuid

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record_audit(
    db: Session,
    *,
    action: str,
    entity: str,
    entity_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    organization_id: uuid.UUID | None = None,
) -> None:
    """Grava um evento de auditoria. Append-only por design (RN-015) — nao existe
    funcao de update/delete para AuditLog neste modulo, deliberadamente.
    """
    db.add(
        AuditLog(
            action=action,
            entity=entity,
            entity_id=entity_id,
            user_id=user_id,
            organization_id=organization_id,
        )
    )
