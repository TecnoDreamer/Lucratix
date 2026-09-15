import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.modules.metrics import engine


class FinancialPeriodUpsert(BaseModel):
    """RN-017: os 5 campos sao valores monetarios de periodo (faturamento,
    custo, despesa, investimento, imposto) — nenhum tem sentido de negocio
    negativo aqui, entao `ge=0` rejeita entrada absurda com 422 em vez de
    deixa-la propagar pros KPIs derivados (profit/margin)."""

    period: date
    revenue: float | None = Field(default=None, ge=0)
    costs: float | None = Field(default=None, ge=0)
    expenses: float | None = Field(default=None, ge=0)
    marketing_investment: float | None = Field(default=None, ge=0)
    taxes: float | None = Field(default=None, ge=0)


class FinancialPeriodRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    period: date
    revenue: float | None
    costs: float | None
    expenses: float | None
    marketing_investment: float | None
    taxes: float | None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def profit(self) -> float | None:
        """Derivado, nunca armazenado (RF-017). Formula unica em
        app/modules/metrics/engine.py::profit — RN-004: custo/despesa/imposto
        ausente conta como 0; receita ausente => nao aplicavel (None)."""
        return engine.profit(self.revenue, self.costs, self.expenses, self.taxes).value

    @computed_field  # type: ignore[prop-decorator]
    @property
    def margin(self) -> float | None:
        """RN-003: sem receita ou receita = 0, margem e 'nao aplicavel' (None).
        Formula unica em app/modules/metrics/engine.py::margin."""
        return engine.margin(self.revenue, self.profit).value
