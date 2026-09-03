import uuid
from datetime import UTC, date, datetime, time, timedelta

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


def list_all_audit_logs(db: Session, organization_id: uuid.UUID) -> list[AuditLog]:
    """Sem paginacao — uso exclusivo da exportacao (RF de exports/, MAX_ROWS
    ja protege contra volume excessivo), nunca de uma tela. Ordem cronologica
    (asc), diferente de `list_audit_logs` (desc, mais recente primeiro pra
    tela) — um arquivo exportado faz mais sentido em ordem crescente, mesmo
    criterio ja usado pelos outros readers de exports/."""
    return (
        db.query(AuditLog)
        .filter(AuditLog.organization_id == organization_id)
        .order_by(AuditLog.created_at.asc())
        .all()
    )


def list_audit_logs_in_range(
    db: Session, organization_id: uuid.UUID, date_from: date, date_to: date
) -> list[AuditLog]:
    """Filtra por dia de calendario inteiro em UTC (created_at e
    timezone-aware, sempre UTC — CreatedAtMixin usa `func.clock_timestamp()`).
    Limite superior exclusivo no dia seguinte a `date_to`, pra incluir o dia
    inteiro sem depender de microssegundo."""
    start = datetime.combine(date_from, time.min, tzinfo=UTC)
    end = datetime.combine(date_to + timedelta(days=1), time.min, tzinfo=UTC)
    return (
        db.query(AuditLog)
        .filter(
            AuditLog.organization_id == organization_id,
            AuditLog.created_at >= start,
            AuditLog.created_at < end,
        )
        .order_by(AuditLog.created_at.asc())
        .all()
    )
