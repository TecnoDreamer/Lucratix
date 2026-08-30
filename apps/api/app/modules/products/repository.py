import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.product import Product


def list_products(db: Session, organization_id: uuid.UUID, *, include_inactive: bool = True) -> list[Product]:
    query = db.query(Product).filter(Product.organization_id == organization_id)
    if not include_inactive:
        query = query.filter(Product.active.is_(True))
    return query.order_by(Product.name).all()


def get_product(db: Session, organization_id: uuid.UUID, product_id: uuid.UUID) -> Product | None:
    return (
        db.query(Product)
        .filter(Product.id == product_id, Product.organization_id == organization_id)
        .one_or_none()
    )


def create_product(db: Session, *, organization_id: uuid.UUID, **fields: object) -> Product:
    product = Product(organization_id=organization_id, **fields)
    db.add(product)
    db.flush()
    return product


def get_product_by_name(db: Session, organization_id: uuid.UUID, name: str) -> Product | None:
    """Comparação sem diferenciar maiúsculas/minúsculas — `name` não tem
    constraint de unicidade no banco (ao contrário de `period` em
    financial_periods/funnel_snapshots), então esta é a defesa real contra
    duplicata na importação (mesma normalização de
    `imports/domains.py::normalize_natural_key_value`)."""
    return (
        db.query(Product)
        .filter(
            Product.organization_id == organization_id,
            func.lower(Product.name) == name.strip().lower(),
        )
        .one_or_none()
    )


def update_product(db: Session, product: Product, **fields: object) -> Product:
    for key, value in fields.items():
        setattr(product, key, value)
    db.flush()
    return product
