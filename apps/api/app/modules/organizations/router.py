from datetime import date

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import (
    OrganizationContext,
    get_current_user,
    get_organization_context,
    require_role,
)
from app.models.membership import MembershipRole
from app.models.user import User
from app.modules.analytics.service import compute_dashboard_metrics
from app.modules.financials import repository as financials_repository
from app.modules.funnels import repository as funnels_repository
from app.modules.organizations import repository
from app.schemas.metrics import MetricResultRead
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationRead,
    OrganizationSummaryRead,
    OrganizationUpdate,
)

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


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
    result = OrganizationRead.model_validate(organization)
    result.my_role = MembershipRole.ORGANIZATION_OWNER.value
    return result


@router.get("")
def list_my_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OrganizationRead]:
    rows = repository.list_organizations_for_user(db, current_user.id)
    results = []
    for org, role in rows:
        item = OrganizationRead.model_validate(org)
        item.my_role = role.value
        results.append(item)
    return results


@router.get("/summary")
def list_my_organizations_summary(
    period: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OrganizationSummaryRead]:
    """Indicadores rapidos por empresa para a lista "Suas empresas" (PARTE 1
    do prompt de redesign de UX de 2026-08-27) — receita, conversao, CAC
    (mesmo motor de calculo do Dashboard) e leads (contagem bruta), num
    unico request para todas as organizacoes do usuario em vez de uma
    chamada por card (evita N+1 de rede) e com no maximo 3 queries no banco
    independente de quantas empresas o usuario tenha (evita N+1 de banco).

    Precisa vir antes de `/{organization_id}` no arquivo: "summary" nao e
    um UUID valido, e sem essa ordem o FastAPI tentaria casar essa rota
    contra o path param daquela primeiro.
    """
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
    # ctx ja garante (RNF-002) que o usuario tem membership ativa em organization_id.
    organization = repository.get_organization(db, ctx.organization_id)
    result = OrganizationRead.model_validate(organization)
    result.my_role = ctx.role.value
    return result


@router.patch("/{organization_id}")
def update_organization(
    data: OrganizationUpdate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ORGANIZATION_ADMIN)),
    db: Session = Depends(get_db),
) -> OrganizationRead:
    organization = repository.get_organization(db, ctx.organization_id)
    # ctx (get_organization_context/require_role) ja garante que a organizacao existe
    # e que o usuario tem membership ativa nela.
    assert organization is not None
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
    result = OrganizationRead.model_validate(organization)
    result.my_role = ctx.role.value
    return result
