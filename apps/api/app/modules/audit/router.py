from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrganizationContext, require_role
from app.models.membership import MembershipRole
from app.modules.audit import repository
from app.schemas.audit import AuditLogRead

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/audit-logs", tags=["audit"]
)


@router.get("")
def list_audit_logs(
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> list[AuditLogRead]:
    logs = repository.list_audit_logs(db, ctx.organization_id)
    return [AuditLogRead.model_validate(log) for log in logs]
