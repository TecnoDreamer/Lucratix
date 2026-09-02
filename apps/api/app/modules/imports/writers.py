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
from app.modules.marketing import repository as marketing_repository
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

    channel_id: uuid.UUID | None = None
    channel_name = transformed.get("channel")
    if channel_name:
        channel = marketing_repository.get_channel_by_name(db, organization_id, cast(str, channel_name))
        if channel is None:
            # Defensivo, mesmo raciocinio de write_campaign_row: validation.py
            # (service.py::_channel_foreign_key_values) ja garantiu que o
            # canal existe no momento da validacao.
            return "skipped"
        channel_id = channel.id

    existing = funnels_repository.get_funnel_snapshot(db, organization_id, period, channel_id=channel_id)
    funnels_repository.upsert_funnel_snapshot(
        db,
        organization_id=organization_id,
        period=period,
        channel_id=channel_id,
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


def write_campaign_row(
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
    channel_name = cast(str, transformed["channel"])
    channel = marketing_repository.get_channel_by_name(db, organization_id, channel_name)
    if channel is None:
        # Defensivo: validation.py (service.py::_foreign_key_values) já
        # garante que o canal existe no momento da validação — isto só
        # dispararia se o canal fosse apagado entre o preview e a
        # confirmação, e hoje não existe nem endpoint para apagar canal.
        # Ignora em vez de derrubar a confirmação inteira por uma linha.
        return "skipped"

    existing = marketing_repository.get_campaign_by_name_and_channel(db, organization_id, name, channel.id)

    fields: dict[str, object] = {
        "name": name,
        "start_date": transformed.get("start_date"),
        "end_date": transformed.get("end_date"),
        "investment": transformed.get("investment"),
        "impressions": transformed.get("impressions"),
        "clicks": transformed.get("clicks"),
        "leads": transformed.get("leads"),
        "opportunities": transformed.get("opportunities"),
        "customers": transformed.get("customers"),
        "attributed_revenue": transformed.get("attributed_revenue"),
    }

    if existing is not None:
        # channel_id nunca entra num update (mesmo contrato de
        # CampaignUpdate, schemas/marketing.py) — a chave natural já é
        # (nome, canal), então o canal de uma duplicata é sempre o mesmo.
        marketing_repository.update_campaign(db, existing, **fields)
        return "updated"
    fields["channel_id"] = channel.id
    marketing_repository.create_campaign(db, organization_id=organization_id, **fields)
    return "created"


DOMAIN_WRITERS = {
    "financial_periods": write_financial_period_row,
    "funnel_snapshots": write_funnel_snapshot_row,
    "products": write_product_row,
    "campaigns": write_campaign_row,
}
