import uuid

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
