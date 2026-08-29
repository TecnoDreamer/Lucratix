"""Escrita por dominio — a metade "adapter" que falta para completar o
pipeline generico (parsers.py cobre a leitura). So financial_periods
existe nesta primeira versao; um dominio novo (Funil, Produtos...) so
precisa de uma funcao equivalente aqui, reaproveitando o repository do
proprio modulo de dominio (nunca duplicando a logica de upsert)."""

import uuid
from datetime import date
from typing import Literal, cast

from sqlalchemy.orm import Session

from app.modules.financials import repository as financials_repository

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


DOMAIN_WRITERS = {
    "financial_periods": write_financial_period_row,
}
