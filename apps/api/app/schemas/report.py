from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.metrics import DashboardRead, PeriodComparisonRead
from app.schemas.organization import OrganizationRead


class BasicReportRead(BaseModel):
    organization: OrganizationRead
    period: date
    generated_at: datetime
    dashboard: DashboardRead
    revenue_vs_baseline: PeriodComparisonRead | None
    profit_vs_baseline: PeriodComparisonRead | None
