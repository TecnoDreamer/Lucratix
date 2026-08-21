import uuid

from pydantic import BaseModel, ConfigDict, Field, computed_field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=255)
    price: float | None = None
    cost: float | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=255)
    price: float | None = None
    cost: float | None = None
    active: bool | None = None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    category: str | None
    price: float | None
    cost: float | None
    active: bool

    @computed_field  # type: ignore[prop-decorator]
    @property
    def margin(self) -> float | None:
        """RN-003: sem preco ou preco = 0, margem e 'nao aplicavel' (None)."""
        if self.price is None or self.cost is None or self.price == 0:
            return None
        return (self.price - self.cost) / self.price
