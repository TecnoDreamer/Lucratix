import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.financial_period import FinancialPeriod


def list_financial_periods(db: Session, organization_id: uuid.UUID) -> list[FinancialPeriod]:
    return (
        db.query(FinancialPeriod)
        .filter(FinancialPeriod.organization_id == organization_id)
        .order_by(FinancialPeriod.period.desc())
        .all()
    )


def get_financial_period(
    db: Session, organization_id: uuid.UUID, period: date
) -> FinancialPeriod | None:
    return (
        db.query(FinancialPeriod)
        .filter(
            FinancialPeriod.organization_id == organization_id,
            FinancialPeriod.period == period,
        )
        .one_or_none()
    )


def upsert_financial_period(
    db: Session, *, organization_id: uuid.UUID, period: date, **fields: object
) -> FinancialPeriod:
    """RF-017: um registro por organizacao+periodo. Chamadas repetidas para o
    mesmo periodo atualizam o registro existente (nao criam duplicata).
    """
    existing = get_financial_period(db, organization_id, period)
    if existing is not None:
        for key, value in fields.items():
            setattr(existing, key, value)
        db.flush()
        return existing

    record = FinancialPeriod(organization_id=organization_id, period=period, **fields)
    db.add(record)
    db.flush()
    return record
