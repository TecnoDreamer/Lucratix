import uuid

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
