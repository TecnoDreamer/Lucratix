from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import MembershipRole
from app.modules.financials import repository
from app.schemas.financial_period import FinancialPeriodRead, FinancialPeriodUpsert

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/financials", tags=["financials"]
)


@router.get("")
def list_financial_periods(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[FinancialPeriodRead]:
    periods = repository.list_financial_periods(db, ctx.organization_id)
    return [FinancialPeriodRead.model_validate(p) for p in periods]


@router.put("", status_code=status.HTTP_200_OK)
def upsert_financial_period(
    data: FinancialPeriodUpsert,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> FinancialPeriodRead:
    record = repository.upsert_financial_period(
        db, organization_id=ctx.organization_id, **data.model_dump()
    )
    record_audit(
        db,
        action="financial_period.upserted",
        entity="financial_period",
        entity_id=record.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return FinancialPeriodRead.model_validate(record)
