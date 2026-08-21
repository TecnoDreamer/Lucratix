from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import MembershipRole
from app.modules.baselines import repository
from app.schemas.baseline import BaselineCreate, BaselineRead

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/baselines", tags=["baselines"]
)


@router.get("")
def list_baselines(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[BaselineRead]:
    return [BaselineRead.model_validate(b) for b in repository.list_baselines(db, ctx.organization_id)]


@router.get("/current")
def get_current_baseline(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> BaselineRead | None:
    baseline = repository.get_current_baseline(db, ctx.organization_id)
    return BaselineRead.model_validate(baseline) if baseline else None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_baseline(
    data: BaselineCreate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> BaselineRead:
    baseline = repository.create_baseline(
        db, organization_id=ctx.organization_id, created_by=ctx.user.id, **data.model_dump()
    )
    record_audit(
        db,
        action="baseline.created",
        entity="baseline",
        entity_id=baseline.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return BaselineRead.model_validate(baseline)
