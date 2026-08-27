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


def list_funnel_snapshots_in_range(
    db: Session, organization_id: uuid.UUID, date_from: date, date_to: date
) -> list[FunnelSnapshot]:
    return (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id == organization_id,
            FunnelSnapshot.period >= date_from.replace(day=1),
            FunnelSnapshot.period <= date_to,
        )
        .order_by(FunnelSnapshot.period.asc())
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


def list_funnel_snapshots_for_organizations(
    db: Session, organization_ids: list[uuid.UUID], period: date
) -> dict[uuid.UUID, FunnelSnapshot]:
    """Igual a `get_funnel_snapshot`, mas para varias organizacoes de uma vez
    em uma unica query — usado pelo resumo de `GET /organizations/summary`
    (lista "Suas empresas") para nao virar N+1 (uma query por empresa).
    """
    if not organization_ids:
        return {}
    rows = (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id.in_(organization_ids),
            FunnelSnapshot.period == period,
        )
        .all()
    )
    return {row.organization_id: row for row in rows}


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
