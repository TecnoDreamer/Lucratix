import uuid
from datetime import date

from sqlalchemy import or_
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
