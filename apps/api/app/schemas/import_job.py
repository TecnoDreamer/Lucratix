import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DomainFieldRead(BaseModel):
    canonical_name: str
    display_name: str
    data_type: str
    required: bool


class MappingSuggestionRead(BaseModel):
    header: str
    canonical_field: str | None
    confidence: str
    display_name: str | None


class ImportJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    domain: str
    source_filename: str
    file_format: str
    status: str
    headers: list[str]
    mapping: dict[str, str] | None
    transform_config: dict[str, object]
    total_rows: int | None
    valid_rows: int | None
    invalid_rows: int | None
    duplicate_rows: int | None
    created_rows: int | None
    updated_rows: int | None
    skipped_rows: int | None
    created_at: datetime
    updated_at: datetime


class ImportJobCreateResponse(BaseModel):
    job: ImportJobRead
    suggested_mapping: list[MappingSuggestionRead]
    domain_fields: list[DomainFieldRead]


# "create_new" do vocabulario generico do prompt mestre nao se aplica a um
# domínio cuja chave natural (organization_id, period) já é a própria
# constraint de unicidade do banco — não existe "criar mesmo já existindo"
# possível para financial_periods. Fica só skip/update aqui; um domínio
# futuro sem chave natural única poderia reintroduzir create_new.
DuplicateStrategy = Literal["skip", "update"]


class MappingUpdate(BaseModel):
    mapping: dict[str, str]
    transform_config: dict[str, object] = Field(default_factory=dict)


class ValidationSummaryRead(BaseModel):
    status: str
    total: int
    valid: int
    invalid: int
    duplicate: int


class PreviewErrorRead(BaseModel):
    field: str | None
    message: str
    raw_value: str | None


class PreviewRowRead(BaseModel):
    row_number: int
    original: dict[str, object]
    transformed: dict[str, object]
    status: str
    errors: list[PreviewErrorRead]


class PreviewPageRead(BaseModel):
    items: list[PreviewRowRead]
    total: int
    limit: int
    offset: int


class ConfirmRequest(BaseModel):
    duplicate_strategy: DuplicateStrategy = "skip"


class ConfirmResponse(BaseModel):
    status: str
    total_rows: int
    created_rows: int
    updated_rows: int
    skipped_rows: int
    invalid_rows: int


class ImportErrorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    row_number: int
    field: str | None
    message: str
    raw_value: str | None


class ImportErrorPageRead(BaseModel):
    items: list[ImportErrorRead]
    total: int
    limit: int
    offset: int


class ImportJobPageRead(BaseModel):
    items: list[ImportJobRead]
    total: int
    limit: int
    offset: int


class MappingTemplateCreate(BaseModel):
    domain: str
    name: str = Field(min_length=1, max_length=100)
    mapping: dict[str, str]


class MappingTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    domain: str
    name: str
    mapping: dict[str, str]
    created_at: datetime
