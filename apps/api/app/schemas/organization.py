import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.organization import OrganizationStatus
from app.schemas.metrics import MetricResultRead


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    trade_name: str | None = Field(default=None, max_length=255)
    segment: str | None = Field(default=None, max_length=255)
    cnpj: str | None = Field(default=None, max_length=32)
    currency: str = Field(default="BRL", min_length=3, max_length=3)
    timezone: str = Field(default="America/Sao_Paulo", max_length=64)
    tracking_start_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    trade_name: str | None = Field(default=None, max_length=255)
    segment: str | None = Field(default=None, max_length=255)
    cnpj: str | None = Field(default=None, max_length=32)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    timezone: str | None = Field(default=None, max_length=64)
    tracking_start_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    trade_name: str | None
    segment: str | None
    cnpj: str | None
    currency: str
    timezone: str
    tracking_start_date: date | None
    notes: str | None
    created_at: datetime
    status: OrganizationStatus
    closed_at: datetime | None
    closure_reason: str | None
    logo_url: str | None
    my_role: str | None = None


class OrganizationPageRead(BaseModel):
    """Página de resultados de GET /organizations (busca + paginação
    server-side — antes devolvia sempre a lista inteira do usuário, sem
    filtro nenhum; não escala para centenas de empresas)."""

    items: list[OrganizationRead]
    total: int
    limit: int
    offset: int


class OrganizationFreezeRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class OrganizationSummaryRead(BaseModel):
    """Resumo de indicadores de uma organizacao para um periodo — usado pela
    lista "Suas empresas" (GET /organizations/summary) para mostrar 3-5
    metricas por card sem uma chamada por empresa (RF novo, seguindo o
    prompt de redesign de UX de 2026-08-27, PARTE 1: "Indicadores rapidos").
    Mesmas metricas/motor de calculo do Dashboard (compute_dashboard_metrics)
    — nenhuma formula nova, so reaproveitado em lote.
    """

    organization_id: uuid.UUID
    revenue: MetricResultRead
    conversion_rate: MetricResultRead
    cac: MetricResultRead
    # Nao e um MetricResult (nao passa pelo motor de metricas) — e a
    # contagem bruta de FunnelSnapshot.leads do periodo, quando existe.
    leads: int | None
