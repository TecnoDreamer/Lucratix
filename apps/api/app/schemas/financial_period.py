import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, computed_field


class FinancialPeriodUpsert(BaseModel):
    period: date
    revenue: float | None = None
    costs: float | None = None
    expenses: float | None = None
    marketing_investment: float | None = None
    taxes: float | None = None


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
        if self.revenue is None:
            return None
        costs = self.costs or 0
        expenses = self.expenses or 0
        taxes = self.taxes or 0
        return self.revenue - costs - expenses - taxes

    @computed_field  # type: ignore[prop-decorator]
    @property
    def margin(self) -> float | None:
        """RN-003: sem receita ou receita = 0, margem e 'nao aplicavel' (None)."""
        profit = self.profit
        if profit is None or self.revenue is None or self.revenue == 0:
            return None
        return profit / self.revenue
