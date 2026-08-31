import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, require_role
from app.models.import_job import ImportJob
from app.models.membership import MembershipRole
from app.modules.imports import repository, service
from app.modules.imports.domains import DOMAIN_REGISTRY, get_domain
from app.modules.imports.parsers import SheetSelectionRequiredError
from app.modules.imports.security import FileValidationError, detect_format_from_filename
from app.schemas.import_job import (
    ConfirmRequest,
    ConfirmResponse,
    DomainFieldRead,
    ImportErrorPageRead,
    ImportErrorRead,
    ImportJobCreateResponse,
    ImportJobPageRead,
    ImportJobRead,
    MappingSuggestionRead,
    MappingTemplateCreate,
    MappingTemplateRead,
    MappingUpdate,
    PreviewErrorRead,
    PreviewPageRead,
    PreviewRowRead,
    ValidationSummaryRead,
    XlsxSheetSelectionRequired,
)

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/imports", tags=["imports"])


def _domain_fields_read(domain_key: str) -> list[DomainFieldRead]:
    domain = get_domain(domain_key)
    if domain is None:
        return []
    return [
        DomainFieldRead(
            canonical_name=f.canonical_name,
            display_name=f.display_name,
            data_type=f.data_type,
            required=f.required,
        )
        for f in domain.fields
    ]


def _get_job_or_404(db: Session, organization_id: uuid.UUID, job_id: uuid.UUID) -> ImportJob:
    job = repository.get_import_job(db, organization_id, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Importação não encontrada")
    return job


@router.get("/domains")
def list_domains(
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
) -> dict[str, list[DomainFieldRead]]:
    """Dominios disponiveis para importacao e seus campos — usado pelo
    frontend para montar a primeira etapa do wizard (escolher destino)."""
    return {key: _domain_fields_read(key) for key in DOMAIN_REGISTRY}


@router.post("/mapping-templates", status_code=status.HTTP_201_CREATED)
def create_mapping_template(
    data: MappingTemplateCreate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> MappingTemplateRead:
    template = repository.create_mapping_template(
        db,
        organization_id=ctx.organization_id,
        created_by=ctx.user.id,
        domain=data.domain,
        name=data.name,
        mapping=data.mapping,
    )
    db.commit()
    return MappingTemplateRead.model_validate(template)


@router.get("/mapping-templates")
def list_mapping_templates(
    domain: str | None = None,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> list[MappingTemplateRead]:
    templates = repository.list_mapping_templates(db, ctx.organization_id, domain=domain)
    return [MappingTemplateRead.model_validate(t) for t in templates]


# As duas rotas de mapping-templates precisam vir ANTES de "/{job_id}" —
# senao "mapping-templates" seria interpretado como um job_id (UUID
# invalido, 422) em vez de casar com a rota estatica. Mesma pegadinha de
# ordenacao ja documentada em organizations/router.py::/summary.
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_import(
    response: Response,
    domain: str = Form(...),
    file: UploadFile = File(...),
    sheet_name: str | None = Form(default=None),
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ImportJobCreateResponse | XlsxSheetSelectionRequired:
    content = await file.read()
    filename = file.filename or "arquivo"
    try:
        file_format = detect_format_from_filename(filename)
        job, suggestions = service.create_import_job_from_upload(
            db,
            organization_id=ctx.organization_id,
            user_id=ctx.user.id,
            domain_key=domain,
            filename=filename,
            file_format=file_format,
            content=content,
            sheet_name=sheet_name,
        )
    except SheetSelectionRequiredError as exc:
        # Nao e um erro de verdade — estado esperado do fluxo (.xlsx com mais
        # de uma aba). Nenhum job criado, nada persistido; sobrescreve o 201
        # padrao da rota (nada foi de fato criado) por 200, e o corpo tem sua
        # propria forma (XlsxSheetSelectionRequired) em vez de reusar
        # ImportJobCreateResponse com campos vazios.
        response.status_code = status.HTTP_200_OK
        return XlsxSheetSelectionRequired(sheets=exc.sheet_names)
    except (FileValidationError, service.DomainNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    record_audit(
        db,
        action="import.created",
        entity="import_job",
        entity_id=job.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return ImportJobCreateResponse(
        job=ImportJobRead.model_validate(job),
        suggested_mapping=[MappingSuggestionRead(**vars(s)) for s in suggestions],
        domain_fields=_domain_fields_read(domain),
    )


@router.get("/{job_id}")
def get_import(
    job_id: uuid.UUID,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ImportJobRead:
    job = _get_job_or_404(db, ctx.organization_id, job_id)
    return ImportJobRead.model_validate(job)


@router.put("/{job_id}/mapping")
def update_mapping(
    job_id: uuid.UUID,
    data: MappingUpdate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ValidationSummaryRead:
    job = _get_job_or_404(db, ctx.organization_id, job_id)
    if job.status in ("COMPLETED", "COMPLETED_WITH_ERRORS", "CANCELLED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta importação já foi concluída ou cancelada — o mapeamento não pode mais ser alterado.",
        )
    summary = service.save_mapping(db, job=job, mapping=data.mapping, transform_config=data.transform_config)
    record_audit(
        db,
        action="import.mapping_changed",
        entity="import_job",
        entity_id=job.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return ValidationSummaryRead(
        status=job.status,
        total=summary.total,
        valid=summary.valid,
        invalid=summary.invalid,
        duplicate=summary.duplicate,
    )


@router.get("/{job_id}/preview")
def preview_import(
    job_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> PreviewPageRead:
    job = _get_job_or_404(db, ctx.organization_id, job_id)
    summary = service.get_validation_summary(db, job)
    page = summary.rows[offset : offset + limit]
    return PreviewPageRead(
        items=[
            PreviewRowRead(
                row_number=r.row_number,
                original=r.original,
                transformed=r.transformed,
                status=r.status,
                errors=[
                    PreviewErrorRead(field=e.field, message=e.message, raw_value=e.raw_value)
                    for e in r.errors
                ],
            )
            for r in page
        ],
        total=summary.total,
        limit=limit,
        offset=offset,
    )


@router.post("/{job_id}/confirm")
def confirm_import(
    job_id: uuid.UUID,
    data: ConfirmRequest,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ConfirmResponse:
    job = _get_job_or_404(db, ctx.organization_id, job_id)
    try:
        final_status = service.confirm_import(db, job=job, duplicate_strategy=data.duplicate_strategy)
    except (service.ImportStateError, service.DomainNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    record_audit(
        db,
        action="import.confirmed",
        entity="import_job",
        entity_id=job.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    record_audit(
        db,
        action=f"import.{final_status.value.lower()}",
        entity="import_job",
        entity_id=job.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return ConfirmResponse(
        status=job.status,
        total_rows=job.total_rows or 0,
        created_rows=job.created_rows or 0,
        updated_rows=job.updated_rows or 0,
        skipped_rows=job.skipped_rows or 0,
        invalid_rows=job.invalid_rows or 0,
    )


@router.get("/{job_id}/errors")
def list_import_errors(
    job_id: uuid.UUID,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ImportErrorPageRead:
    job = _get_job_or_404(db, ctx.organization_id, job_id)
    errors = repository.list_import_errors(db, job.id, limit=limit, offset=offset)
    total = repository.count_import_errors(db, job.id)
    return ImportErrorPageRead(
        items=[ImportErrorRead.model_validate(e) for e in errors], total=total, limit=limit, offset=offset
    )


@router.get("")
def list_imports(
    domain: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ImportJobPageRead:
    jobs = repository.list_import_jobs(db, ctx.organization_id, domain=domain, limit=limit, offset=offset)
    total = repository.count_import_jobs(db, ctx.organization_id, domain=domain)
    return ImportJobPageRead(
        items=[ImportJobRead.model_validate(j) for j in jobs], total=total, limit=limit, offset=offset
    )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_import(
    job_id: uuid.UUID,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> None:
    job = _get_job_or_404(db, ctx.organization_id, job_id)
    try:
        service.cancel_import(db, job=job)
    except service.ImportStateError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc
    db.commit()
