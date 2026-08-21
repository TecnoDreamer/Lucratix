import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import MembershipRole
from app.modules.marketing import repository
from app.schemas.marketing import (
    CampaignCreate,
    CampaignRead,
    CampaignUpdate,
    MarketingChannelCreate,
    MarketingChannelRead,
)

channels_router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/marketing-channels", tags=["marketing"]
)
campaigns_router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/campaigns", tags=["marketing"]
)


@channels_router.get("")
def list_channels(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[MarketingChannelRead]:
    return [MarketingChannelRead.model_validate(c) for c in repository.list_channels(db, ctx.organization_id)]


@channels_router.post("", status_code=status.HTTP_201_CREATED)
def create_channel(
    data: MarketingChannelCreate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> MarketingChannelRead:
    channel = repository.create_channel(db, organization_id=ctx.organization_id, **data.model_dump())
    record_audit(
        db,
        action="marketing_channel.created",
        entity="marketing_channel",
        entity_id=channel.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return MarketingChannelRead.model_validate(channel)


@campaigns_router.get("")
def list_campaigns(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[CampaignRead]:
    return [CampaignRead.model_validate(c) for c in repository.list_campaigns(db, ctx.organization_id)]


@campaigns_router.post("", status_code=status.HTTP_201_CREATED)
def create_campaign(
    data: CampaignCreate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> CampaignRead:
    # RN-005: o canal precisa pertencer a mesma organizacao da campanha.
    channel = repository.get_channel(db, ctx.organization_id, data.channel_id)
    if channel is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Canal de marketing nao encontrado nesta organizacao",
        )

    campaign = repository.create_campaign(db, organization_id=ctx.organization_id, **data.model_dump())
    record_audit(
        db,
        action="campaign.created",
        entity="campaign",
        entity_id=campaign.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return CampaignRead.model_validate(campaign)


@campaigns_router.patch("/{campaign_id}")
def update_campaign(
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> CampaignRead:
    campaign = repository.get_campaign(db, ctx.organization_id, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campanha nao encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)

    record_audit(
        db,
        action="campaign.updated",
        entity="campaign",
        entity_id=campaign.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return CampaignRead.model_validate(campaign)
