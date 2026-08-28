import uuid

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def list_audit_logs(
    db: Session, organization_id: uuid.UUID, limit: int = 50, offset: int = 0
) -> list[AuditLog]:
    return (
        db.query(AuditLog)
        .filter(AuditLog.organization_id == organization_id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_audit_logs(db: Session, organization_id: uuid.UUID) -> int:
    return db.query(AuditLog).filter(AuditLog.organization_id == organization_id).count()
