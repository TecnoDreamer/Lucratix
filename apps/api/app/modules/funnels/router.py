from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import MembershipRole
from app.modules.funnels import repository
from app.schemas.funnel_snapshot import FunnelSnapshotRead, FunnelSnapshotUpsert

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/funnel-snapshots", tags=["funnel"])


@router.get("")
def list_funnel_snapshots(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[FunnelSnapshotRead]:
    snapshots = repository.list_funnel_snapshots(db, ctx.organization_id)
    return [FunnelSnapshotRead.model_validate(s) for s in snapshots]


@router.put("", status_code=status.HTTP_200_OK)
def upsert_funnel_snapshot(
    data: FunnelSnapshotUpsert,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> FunnelSnapshotRead:
    record = repository.upsert_funnel_snapshot(
        db, organization_id=ctx.organization_id, **data.model_dump()
    )
    record_audit(
        db,
        action="funnel_snapshot.upserted",
        entity="funnel_snapshot",
        entity_id=record.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return FunnelSnapshotRead.model_validate(record)
