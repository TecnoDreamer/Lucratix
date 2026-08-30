import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.membership import MembershipRole
from app.modules.products import repository
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/products", tags=["products"])


@router.get("")
def list_products(
    include_inactive: bool = True,
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> list[ProductRead]:
    products = repository.list_products(db, ctx.organization_id, include_inactive=include_inactive)
    return [ProductRead.model_validate(p) for p in products]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = repository.create_product(
        db, organization_id=ctx.organization_id, **data.model_dump()
    )
    record_audit(
        db,
        action="product.created",
        entity="product",
        entity_id=product.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return ProductRead.model_validate(product)


@router.patch("/{product_id}")
def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = repository.get_product(db, ctx.organization_id, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto nao encontrado")

    repository.update_product(db, product, **data.model_dump(exclude_unset=True))

    record_audit(
        db,
        action="product.updated",
        entity="product",
        entity_id=product.id,
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()
    return ProductRead.model_validate(product)
