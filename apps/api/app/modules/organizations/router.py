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
from app.modules.organizations import repository
from app.schemas.organization import OrganizationCreate, OrganizationRead, OrganizationUpdate

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
