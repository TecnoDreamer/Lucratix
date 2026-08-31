import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import MembershipRole
from app.modules.targets import repository
from app.schemas.target import TargetRead, TargetUpsert

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/targets", tags=["targets"])


@router.get("")
def list_targets(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[TargetRead]:
    """Mesma permissao de leitura de financials/funnel-snapshots (qualquer
    membership ativa, inclusive VIEWER) — meta e informativa, nao sensivel."""
    return [TargetRead.model_validate(t) for t in repository.list_targets(db, ctx.organization_id)]


@router.put("", status_code=status.HTTP_200_OK)
def upsert_target(
    data: TargetUpsert,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> TargetRead:
    record = repository.upsert_target(
        db,
        organization_id=ctx.organization_id,
        metric=data.metric,
        period=data.period,
        value=data.value,
        created_by=ctx.user.id,
    )
    record_audit(
        db,
        action="target.upserted",
        entity="target",
        entity_id=record.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return TargetRead.model_validate(record)


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(
    target_id: uuid.UUID,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> None:
    target = repository.get_target_by_id(db, ctx.organization_id, target_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta nao encontrada")
    repository.delete_target(db, target)
    record_audit(
        db,
        action="target.deleted",
        entity="target",
        entity_id=target_id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
