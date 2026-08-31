import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.target import Target, TargetMetric


def list_targets(db: Session, organization_id: uuid.UUID) -> list[Target]:
    return (
        db.query(Target)
        .filter(Target.organization_id == organization_id)
        .order_by(Target.period.desc(), Target.metric.asc())
        .all()
    )


def list_targets_in_range(
    db: Session, organization_id: uuid.UUID, date_from: date, date_to: date
) -> list[Target]:
    """Mesma regra de `financials_repository.list_financial_periods_in_range`:
    `period` marca o mes (dia 1), entao um `date_to` no meio de um mes ainda
    inclui aquele mes inteiro."""
    return (
        db.query(Target)
        .filter(
            Target.organization_id == organization_id,
            Target.period >= date_from.replace(day=1),
            Target.period <= date_to,
        )
        .order_by(Target.period.asc())
        .all()
    )


def get_target(
    db: Session, organization_id: uuid.UUID, metric: TargetMetric, period: date
) -> Target | None:
    return (
        db.query(Target)
        .filter(
            Target.organization_id == organization_id,
            Target.metric == metric,
            Target.period == period,
        )
        .one_or_none()
    )


def get_target_by_id(db: Session, organization_id: uuid.UUID, target_id: uuid.UUID) -> Target | None:
    return (
        db.query(Target)
        .filter(Target.organization_id == organization_id, Target.id == target_id)
        .one_or_none()
    )


def upsert_target(
    db: Session,
    *,
    organization_id: uuid.UUID,
    metric: TargetMetric,
    period: date,
    value: float,
    created_by: uuid.UUID | None,
) -> Target:
    """Uma meta por organizacao+metrica+mes — chamada repetida pro mesmo
    trio atualiza o valor existente (nao cria duplicata), mesmo padrao de
    `financials_repository.upsert_financial_period`."""
    existing = get_target(db, organization_id, metric, period)
    if existing is not None:
        existing.value = value
        db.flush()
        return existing

    record = Target(
        organization_id=organization_id,
        metric=metric,
        period=period,
        value=value,
        created_by=created_by,
    )
    db.add(record)
    db.flush()
    return record


def delete_target(db: Session, target: Target) -> None:
    db.delete(target)
    db.flush()
