from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context
from app.modules.exports import service

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/exports", tags=["exports"])

# Mesmo nível de permissão de GET /financials (get_organization_context, sem
# papel mínimo): exportar é ler o mesmo dado que VIEWER já pode ver na tela,
# só que em arquivo — RN-010 não distingue "ver na tela" de "baixar o mesmo
# dado" (ver docs/data-import-export/ARCHITECTURE.md). Continua exigindo
# membership ativa na organização (RNF-002), como qualquer rota aqui.


@router.get("/{domain}")
def export_domain(
    domain: str,
    file_format: Literal["csv", "xlsx", "json"] = Query(alias="format"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> Response:
    try:
        content, content_type, filename = service.export_domain(
            db,
            organization_id=ctx.organization_id,
            domain_key=domain,
            file_format=file_format,
            date_from=date_from,
            date_to=date_to,
        )
    except (
        service.DomainNotFoundError,
        service.UnsupportedExportFormatError,
        service.ExportTooLargeError,
    ) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    record_audit(
        db,
        action=f"export.{domain}.downloaded",
        entity="export",
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()

    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
