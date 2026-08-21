"""RN-002 / ADR-0005: append-only. Nao ha update_baseline nem delete_baseline
neste modulo, deliberadamente.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.baseline import Baseline


def list_baselines(db: Session, organization_id: uuid.UUID) -> list[Baseline]:
    return (
        db.query(Baseline)
        .filter(Baseline.organization_id == organization_id)
        .order_by(Baseline.created_at.desc())
        .all()
    )


def get_current_baseline(db: Session, organization_id: uuid.UUID) -> Baseline | None:
    return (
        db.query(Baseline)
        .filter(Baseline.organization_id == organization_id)
        .order_by(Baseline.created_at.desc())
        .first()
    )


def create_baseline(
    db: Session, *, organization_id: uuid.UUID, created_by: uuid.UUID, **fields: object
) -> Baseline:
    baseline = Baseline(organization_id=organization_id, created_by=created_by, **fields)
    db.add(baseline)
    db.flush()
    return baseline
