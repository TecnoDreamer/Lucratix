from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrganizationContext, require_role
from app.models.membership import MembershipRole
from app.modules.audit import repository
from app.schemas.audit import AuditLogPageRead, AuditLogRead

router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/audit-logs", tags=["audit"]
)


@router.get("")
def list_audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> AuditLogPageRead:
    # Antes retornava sempre so os 100 mais recentes, sem forma de ver
    # entradas mais antigas (auditoria de banco, 2026-08-27) — agora pagina
    # de verdade, com `total` para o frontend saber quando parar de oferecer
    # "carregar mais".
    logs = repository.list_audit_logs(db, ctx.organization_id, limit=limit, offset=offset)
    total = repository.count_audit_logs(db, ctx.organization_id)
    return AuditLogPageRead(
        items=[AuditLogRead.model_validate(log) for log in logs],
        total=total,
        limit=limit,
        offset=offset,
    )
