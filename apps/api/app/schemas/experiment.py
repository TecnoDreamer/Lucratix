import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models.experiment import ExperimentStatus
from app.schemas.metrics import MetricResultRead


class ExperimentVariantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ExperimentVariantResultUpdate(BaseModel):
    sample_size: int | None = None
    conversions: int | None = None


class ExperimentStatusUpdate(BaseModel):
    status: ExperimentStatus


class ExperimentCreate(BaseModel):
    hypothesis: str = Field(min_length=1, max_length=2000)
    page_or_process: str = Field(min_length=1, max_length=255)
    primary_metric: str = Field(min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    variants: list[ExperimentVariantCreate] = Field(min_length=2)


class ExperimentVariantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sample_size: int | None
    conversions: int | None


class ExperimentVariantSummaryRead(BaseModel):
    name: str
    sample_size: int | None
    conversions: int | None
    conversion_rate: MetricResultRead
    # p-valor do teste-z de duas proporções contra a variante Controle (a
    # primeira da lista) — None na própria Controle, e em qualquer variante
    # enquanto `has_sufficient_sample` for False (ver analysis.py).
    p_value: float | None = None
    is_significant: bool | None = None


class ExperimentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    hypothesis: str
    page_or_process: str
    primary_metric: str
    start_date: date | None
    end_date: date | None
    status: ExperimentStatus
    variants: list[ExperimentVariantRead]


class ExperimentResultRead(BaseModel):
    variants: list[ExperimentVariantSummaryRead]
    has_sufficient_sample: bool
    leading_variant_name: str | None
    note: str
    significance_alpha: float
