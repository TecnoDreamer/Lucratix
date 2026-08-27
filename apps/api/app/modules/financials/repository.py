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


def list_financial_periods_in_range(
    db: Session, organization_id: uuid.UUID, date_from: date, date_to: date
) -> list[FinancialPeriod]:
    """RF-023 (filtro de intervalo de datas): `period` marca o mes (dia 1),
    entao um `date_to` no meio de um mes ainda inclui aquele mes inteiro —
    os dados so existem no grao mensal, nao ha como recortar dentro do mes.
    """
    return (
        db.query(FinancialPeriod)
        .filter(
            FinancialPeriod.organization_id == organization_id,
            FinancialPeriod.period >= date_from.replace(day=1),
            FinancialPeriod.period <= date_to,
        )
        .order_by(FinancialPeriod.period.asc())
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


def list_financial_periods_for_organizations(
    db: Session, organization_ids: list[uuid.UUID], period: date
) -> dict[uuid.UUID, FinancialPeriod]:
    """Igual a `get_financial_period`, mas para varias organizacoes de uma
    vez em uma unica query — usado pelo resumo de `GET /organizations/summary`
    (lista "Suas empresas") para nao virar N+1 (uma query por empresa).
    """
    if not organization_ids:
        return {}
    rows = (
        db.query(FinancialPeriod)
        .filter(
            FinancialPeriod.organization_id.in_(organization_ids),
            FinancialPeriod.period == period,
        )
        .all()
    )
    return {row.organization_id: row for row in rows}


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
