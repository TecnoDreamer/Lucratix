import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import (
    OrganizationAdminContext,
    OrganizationContext,
    get_current_user,
    get_organization_context,
    require_org_admin_or_platform_admin,
    require_role,
    require_role_allow_frozen,
)
from app.core.rate_limit import logo_upload_rate_limiter
from app.core.storage import (
    StorageError,
    StorageNotConfiguredError,
    destroy_organization_logo,
    upload_organization_logo,
)
from app.models.membership import MembershipRole
from app.models.user import User
from app.modules.analytics.service import compute_dashboard_metrics
from app.modules.financials import repository as financials_repository
from app.modules.funnels import repository as funnels_repository
from app.modules.organizations import repository, service
from app.modules.organizations.logo_security import ImageValidationError, validate_logo
from app.schemas.metrics import MetricResultRead
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationFreezeRequest,
    OrganizationPageRead,
    OrganizationRead,
    OrganizationSummaryRead,
    OrganizationUpdate,
)

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


def _organization_read(organization: object, role: MembershipRole | str | None) -> OrganizationRead:
    result = OrganizationRead.model_validate(organization)
    result.my_role = role.value if isinstance(role, MembershipRole) else role
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationRead:
    organization = repository.create_organization_with_owner(
        db, owner_id=current_user.id, **data.model_dump()
    )
    record_audit(
        db,
        action="organization.created",
        entity="organization",
        entity_id=organization.id,
        user_id=current_user.id,
        organization_id=organization.id,
    )
    db.commit()
    return _organization_read(organization, MembershipRole.ORGANIZATION_OWNER)


@router.get("")
def list_my_organizations(
    search: str | None = Query(default=None, max_length=255),
    status_filter: str = Query(default="all", alias="status", pattern="^(active|frozen|all)$"),
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationPageRead:
    """Busca + paginação server-side (antes devolvia sempre a lista inteira
    do usuário, sem filtro nenhum — não escala para centenas de empresas)."""
    rows, total = repository.list_organizations_for_user_page(
        db, current_user.id, search=search, status_filter=status_filter, limit=limit, offset=offset
    )
    return OrganizationPageRead(
        items=[_organization_read(org, role) for org, role in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/summary")
def list_my_organizations_summary(
    period: date,
    organization_id: list[uuid.UUID] | None = Query(default=None, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OrganizationSummaryRead]:
    """Indicadores rapidos por empresa para a lista "Suas empresas" (PARTE 1
    do prompt de redesign de UX de 2026-08-27) — receita, conversao, CAC
    (mesmo motor de calculo do Dashboard) e leads (contagem bruta), num
    unico request para todas as organizacoes do usuario em vez de uma
    chamada por card (evita N+1 de rede) e com no maximo 3 queries no banco
    independente de quantas empresas o usuario tenha (evita N+1 de banco).

    `organization_id` (opcional, repetivel): pede so os ids de uma pagina
    especifica em vez da lista toda — a busca sempre passa por
    `list_organizations_by_ids_for_user`, que so devolve organizacoes onde o
    usuario tem membership ativa (um id de outro tenant simplesmente nao
    aparece no resultado, nunca 403 — sem virar oraculo de existencia).

    Precisa vir antes de `/{organization_id}` no arquivo: "summary" nao e
    um UUID valido, e sem essa ordem o FastAPI tentaria casar essa rota
    contra o path param daquela primeiro.
    """
    if organization_id:
        rows = repository.list_organizations_by_ids_for_user(db, current_user.id, organization_id)
    else:
        rows = repository.list_organizations_for_user(db, current_user.id)
    organization_ids = [org.id for org, _role in rows]

    financials_by_org = financials_repository.list_financial_periods_for_organizations(
        db, organization_ids, period
    )
    funnels_by_org = funnels_repository.list_funnel_snapshots_for_organizations(
        db, organization_ids, period
    )

    results = []
    for org, _role in rows:
        financial = financials_by_org.get(org.id)
        funnel = funnels_by_org.get(org.id)
        metrics = compute_dashboard_metrics(financial, funnel)
        results.append(
            OrganizationSummaryRead(
                organization_id=org.id,
                revenue=MetricResultRead.from_result(metrics["revenue"]),
                conversion_rate=MetricResultRead.from_result(metrics["conversion_rate"]),
                cac=MetricResultRead.from_result(metrics["cac"]),
                leads=funnel.leads if funnel else None,
            )
        )
    return results


@router.get("/{organization_id}")
def get_organization(
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> OrganizationRead:
    # ctx ja garante (RNF-002) que o usuario tem membership ativa em
    # organization_id. GET nunca e bloqueado por organizacao congelada — e o
    # que garante que um deep link pra empresa encerrada nunca vira 404 pra
    # quem ainda tem acesso a ela.
    organization = repository.get_organization(db, ctx.organization_id)
    return _organization_read(organization, ctx.role)


@router.patch("/{organization_id}")
def update_organization(
    data: OrganizationUpdate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> OrganizationRead:
    # require_role -> get_organization_context ja bloqueia (409) se a
    # organizacao estiver congelada, antes de chegar aqui.
    organization = repository.get_organization(db, ctx.organization_id)
    # ctx (get_organization_context/require_role) ja garante que a organizacao existe
    # e que o usuario tem membership ativa nela.
    assert organization is not None
    # `status`/`logo_url` deliberadamente NAO fazem parte de OrganizationUpdate:
    # esse setattr generico bypassaria o fluxo de congelar/reativar (sem
    # closed_at/closed_by/auditoria proprios) e o de logo (sem validacao de
    # conteudo nem Cloudinary). Ver /freeze, /reactivate, /logo abaixo.
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(organization, field, value)
    record_audit(
        db,
        action="organization.updated",
        entity="organization",
        entity_id=organization.id,
        user_id=ctx.user.id,
        organization_id=organization.id,
    )
    db.commit()
    return _organization_read(organization, ctx.role)


@router.post("/{organization_id}/freeze")
def freeze_organization(
    data: OrganizationFreezeRequest,
    ctx: OrganizationContext = Depends(require_role_allow_frozen(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> OrganizationRead:
    """Encerra (congela) a organização — nunca apaga nada. Toda escrita
    subsequente com escopo desta organização passa a ser bloqueada (409) em
    `core/deps.py::_ensure_organization_writable`; leitura e histórico
    continuam intactos e acessíveis."""
    try:
        organization = service.freeze_organization(
            db, organization_id=ctx.organization_id, closed_by=ctx.user.id, reason=data.reason
        )
    except service.OrganizationAlreadyFrozenError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    record_audit(
        db,
        action="organization.frozen",
        entity="organization",
        entity_id=organization.id,
        user_id=ctx.user.id,
        organization_id=organization.id,
    )
    db.commit()
    return _organization_read(organization, ctx.role)


@router.post("/{organization_id}/reactivate")
def reactivate_organization(
    ctx: OrganizationContext = Depends(require_role_allow_frozen(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> OrganizationRead:
    """Reativa a MESMA organização (mesmo id, mesmo histórico, nunca cria um
    registro novo) — a permanente do congelamento já vive no audit log
    (append-only), limpar closed_at/closed_by/closure_reason aqui não perde
    informação nenhuma."""
    try:
        organization = service.reactivate_organization(db, organization_id=ctx.organization_id)
    except service.OrganizationAlreadyActiveError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    record_audit(
        db,
        action="organization.reactivated",
        entity="organization",
        entity_id=organization.id,
        user_id=ctx.user.id,
        organization_id=organization.id,
    )
    db.commit()
    return _organization_read(organization, ctx.role)


@router.post("/{organization_id}/logo")
async def upload_logo(
    request: Request,
    file: UploadFile = File(...),
    ctx: OrganizationAdminContext = Depends(require_org_admin_or_platform_admin),
    db: Session = Depends(get_db),
) -> OrganizationRead:
    """Restrito a ORGANIZATION_OWNER/ORGANIZATION_ADMIN (membership normal)
    OU Super Admin da plataforma (sem membership — ver
    core/deps.py::require_org_admin_or_platform_admin). Backend sempre
    valida — esconder o botão no frontend nunca é a autorização de verdade.
    """
    client_host = request.client.host if request.client else "unknown"
    if not logo_upload_rate_limiter.check(f"{ctx.user.id}:{ctx.organization.id}:{client_host}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de envio. Tente novamente em instantes.",
        )

    content = await file.read()
    filename = file.filename or "logo"
    try:
        image_format = validate_logo(filename=filename, content=content)
    except ImageValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    try:
        logo_url = upload_organization_logo(
            organization_id=str(ctx.organization.id), content=content, image_format=image_format
        )
    except StorageNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message) from exc

    ctx.organization.logo_url = logo_url
    record_audit(
        db,
        action="organization.logo_updated_by_platform_admin"
        if ctx.via_platform_admin
        else "organization.logo_updated",
        entity="organization",
        entity_id=ctx.organization.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization.id,
    )
    db.commit()
    return _organization_read(ctx.organization, ctx.role)


@router.delete("/{organization_id}/logo")
def remove_logo(
    ctx: OrganizationAdminContext = Depends(require_org_admin_or_platform_admin),
    db: Session = Depends(get_db),
) -> OrganizationRead:
    if ctx.organization.logo_url is not None:
        destroy_organization_logo(organization_id=str(ctx.organization.id))
        ctx.organization.logo_url = None
        record_audit(
            db,
            action="organization.logo_removed_by_platform_admin"
            if ctx.via_platform_admin
            else "organization.logo_removed",
            entity="organization",
            entity_id=ctx.organization.id,
            user_id=ctx.user.id,
            organization_id=ctx.organization.id,
        )
        db.commit()
    return _organization_read(ctx.organization, ctx.role)
