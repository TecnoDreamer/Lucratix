import uuid

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def list_audit_logs(db: Session, organization_id: uuid.UUID, limit: int = 100) -> list[AuditLog]:
    return (
        db.query(AuditLog)
        .filter(AuditLog.organization_id == organization_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
