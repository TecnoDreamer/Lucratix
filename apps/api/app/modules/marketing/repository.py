import uuid
from datetime import date

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.marketing_channel import MarketingChannel


def list_channels(db: Session, organization_id: uuid.UUID) -> list[MarketingChannel]:
    return (
        db.query(MarketingChannel)
        .filter(MarketingChannel.organization_id == organization_id)
        .order_by(MarketingChannel.name)
        .all()
    )


def get_channel(db: Session, organization_id: uuid.UUID, channel_id: uuid.UUID) -> MarketingChannel | None:
    return (
        db.query(MarketingChannel)
        .filter(MarketingChannel.id == channel_id, MarketingChannel.organization_id == organization_id)
        .one_or_none()
    )


def create_channel(db: Session, *, organization_id: uuid.UUID, **fields: object) -> MarketingChannel:
    channel = MarketingChannel(organization_id=organization_id, **fields)
    db.add(channel)
    db.flush()
    return channel


def get_channel_by_name(db: Session, organization_id: uuid.UUID, name: str) -> MarketingChannel | None:
    """Comparação sem diferenciar maiúsculas/minúsculas — usada pelo módulo
    de importação para resolver o nome de canal escrito no arquivo (mesma
    normalização de `imports/domains.py::normalize_natural_key_value`)."""
    return (
        db.query(MarketingChannel)
        .filter(
            MarketingChannel.organization_id == organization_id,
            func.lower(MarketingChannel.name) == name.strip().lower(),
        )
        .one_or_none()
    )


def get_channels_by_ids(
    db: Session, organization_id: uuid.UUID, channel_ids: set[uuid.UUID]
) -> dict[uuid.UUID, MarketingChannel]:
    """Busca em lote (evita N+1) — usada pela exportação para anexar o nome
    do canal a cada campanha sem uma query por linha."""
    if not channel_ids:
        return {}
    rows = (
        db.query(MarketingChannel)
        .filter(
            MarketingChannel.organization_id == organization_id,
            MarketingChannel.id.in_(channel_ids),
        )
        .all()
    )
    return {c.id: c for c in rows}


def list_campaigns(db: Session, organization_id: uuid.UUID) -> list[Campaign]:
    return (
        db.query(Campaign)
        .filter(Campaign.organization_id == organization_id)
        .order_by(Campaign.start_date.desc().nulls_last())
        .all()
    )


def list_campaigns_in_range(
    db: Session, organization_id: uuid.UUID, date_from: date, date_to: date
) -> list[Campaign]:
    """RF-023 (analytics de marketing): campanhas cujo periodo (start_date..
    end_date) se sobrepoe ao intervalo pedido. `start_date`/`end_date` sao
    opcionais (campanha pode nao ter data registrada) — uma campanha SEM
    NENHUMA das duas datas e excluida (nao ha como saber se ela rodou
    dentro do intervalo, e incluir sempre distorceria qualquer filtro).
    """
    return (
        db.query(Campaign)
        .filter(
            Campaign.organization_id == organization_id,
            Campaign.start_date.isnot(None) | Campaign.end_date.isnot(None),
            or_(Campaign.start_date.is_(None), Campaign.start_date <= date_to),
            or_(Campaign.end_date.is_(None), Campaign.end_date >= date_from),
        )
        .order_by(Campaign.start_date.asc().nulls_last())
        .all()
    )


def get_campaign(db: Session, organization_id: uuid.UUID, campaign_id: uuid.UUID) -> Campaign | None:
    return (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id, Campaign.organization_id == organization_id)
        .one_or_none()
    )


def create_campaign(db: Session, *, organization_id: uuid.UUID, **fields: object) -> Campaign:
    campaign = Campaign(organization_id=organization_id, **fields)
    db.add(campaign)
    db.flush()
    return campaign


def get_campaign_by_name_and_channel(
    db: Session, organization_id: uuid.UUID, name: str, channel_id: uuid.UUID
) -> Campaign | None:
    """Chave natural de Campanha para o módulo de importação: nome sozinho é
    ambíguo (duas campanhas podem ter o mesmo nome em canais diferentes),
    então a busca é sempre nome + canal — comparação de nome sem
    diferenciar maiúsculas/minúsculas, mesma normalização do resto do
    módulo."""
    return (
        db.query(Campaign)
        .filter(
            Campaign.organization_id == organization_id,
            Campaign.channel_id == channel_id,
            func.lower(Campaign.name) == name.strip().lower(),
        )
        .one_or_none()
    )


def update_campaign(db: Session, campaign: Campaign, **fields: object) -> Campaign:
    for key, value in fields.items():
        setattr(campaign, key, value)
    db.flush()
    return campaign
