"""Escrita por dominio — a metade "adapter" que falta para completar o
pipeline generico (parsers.py cobre a leitura). Um dominio novo (Produtos...)
so precisa de uma funcao equivalente aqui, reaproveitando o repository do
proprio modulo de dominio (nunca duplicando a logica de upsert)."""

import uuid
from datetime import date
from typing import Literal, cast

from sqlalchemy.orm import Session

from app.modules.financials import repository as financials_repository
from app.modules.funnels import repository as funnels_repository
from app.modules.products import repository as products_repository

WriteOutcome = Literal["created", "updated", "skipped"]


def write_financial_period_row(
    db: Session,
    *,
    organization_id: uuid.UUID,
    transformed: dict[str, object],
    duplicate_strategy: str,
    is_duplicate: bool,
) -> WriteOutcome:
    if is_duplicate and duplicate_strategy == "skip":
        return "skipped"

    period = cast(date, transformed["period"])
    existing = financials_repository.get_financial_period(db, organization_id, period)
    financials_repository.upsert_financial_period(
        db,
        organization_id=organization_id,
        period=period,
        revenue=transformed.get("revenue"),
        costs=transformed.get("costs"),
        expenses=transformed.get("expenses"),
        marketing_investment=transformed.get("marketing_investment"),
        taxes=transformed.get("taxes"),
    )
    return "updated" if existing is not None else "created"


def write_funnel_snapshot_row(
    db: Session,
    *,
    organization_id: uuid.UUID,
    transformed: dict[str, object],
    duplicate_strategy: str,
    is_duplicate: bool,
) -> WriteOutcome:
    if is_duplicate and duplicate_strategy == "skip":
        return "skipped"

    period = cast(date, transformed["period"])
    existing = funnels_repository.get_funnel_snapshot(db, organization_id, period)
    funnels_repository.upsert_funnel_snapshot(
        db,
        organization_id=organization_id,
        period=period,
        impressions=transformed.get("impressions"),
        visits=transformed.get("visits"),
        leads=transformed.get("leads"),
        mqls=transformed.get("mqls"),
        sqls=transformed.get("sqls"),
        opportunities=transformed.get("opportunities"),
        customers=transformed.get("customers"),
        repeat_purchases=transformed.get("repeat_purchases"),
    )
    return "updated" if existing is not None else "created"


def write_product_row(
    db: Session,
    *,
    organization_id: uuid.UUID,
    transformed: dict[str, object],
    duplicate_strategy: str,
    is_duplicate: bool,
) -> WriteOutcome:
    if is_duplicate and duplicate_strategy == "skip":
        return "skipped"

    name = cast(str, transformed["name"])
    existing = products_repository.get_product_by_name(db, organization_id, name)

    fields: dict[str, object] = {
        "name": name,
        "category": transformed.get("category"),
        "price": transformed.get("price"),
        "cost": transformed.get("cost"),
    }
    # `active` é NOT NULL com default True no banco (ao contrário de
    # revenue/costs etc., que são nullable de verdade) — "não mapeado/em
    # branco" aqui tem que significar "não mexe" (update) / "usa o default"
    # (create), nunca `active=None` explícito (violaria a constraint).
    active = transformed.get("active")
    if active is not None:
        fields["active"] = active

    if existing is not None:
        products_repository.update_product(db, existing, **fields)
        return "updated"
    products_repository.create_product(db, organization_id=organization_id, **fields)
    return "created"


DOMAIN_WRITERS = {
    "financial_periods": write_financial_period_row,
    "funnel_snapshots": write_funnel_snapshot_row,
    "products": write_product_row,
}
