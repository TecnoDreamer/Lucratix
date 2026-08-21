import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.funnel_snapshot import FunnelSnapshot


def list_funnel_snapshots(db: Session, organization_id: uuid.UUID) -> list[FunnelSnapshot]:
    return (
        db.query(FunnelSnapshot)
        .filter(FunnelSnapshot.organization_id == organization_id)
        .order_by(FunnelSnapshot.period.desc())
        .all()
    )


def get_funnel_snapshot(db: Session, organization_id: uuid.UUID, period: date) -> FunnelSnapshot | None:
    return (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id == organization_id,
            FunnelSnapshot.period == period,
        )
        .one_or_none()
    )


def upsert_funnel_snapshot(
    db: Session, *, organization_id: uuid.UUID, period: date, **fields: object
) -> FunnelSnapshot:
    existing = get_funnel_snapshot(db, organization_id, period)
    if existing is not None:
        for key, value in fields.items():
            setattr(existing, key, value)
        db.flush()
        return existing

    record = FunnelSnapshot(organization_id=organization_id, period=period, **fields)
    db.add(record)
    db.flush()
    return record
