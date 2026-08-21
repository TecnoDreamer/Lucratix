"""RF-026: relatorio basico. Composicao fina sobre modulos ja existentes
(organizations, baselines, financials, funnels, metrics) — nao introduz
nenhuma regra de negocio nova.
"""

from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context
from app.modules.analytics.service import compute_dashboard_metrics
from app.modules.baselines import repository as baselines_repository
from app.modules.financials import repository as financials_repository
from app.modules.funnels import repository as funnels_repository
from app.modules.metrics.engine import compare_periods
from app.modules.organizations import repository as organizations_repository
from app.schemas.metrics import DashboardRead, MetricResultRead, PeriodComparisonRead
from app.schemas.organization import OrganizationRead
from app.schemas.report import BasicReportRead

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/reports", tags=["reports"])


@router.get("/basic")
def get_basic_report(
    period: date,
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> BasicReportRead:
    organization = organizations_repository.get_organization(db, ctx.organization_id)
    assert organization is not None

    financial = financials_repository.get_financial_period(db, ctx.organization_id, period)
    funnel = funnels_repository.get_funnel_snapshot(db, ctx.organization_id, period)
    metrics = compute_dashboard_metrics(financial, funnel)
    dashboard = DashboardRead(
        **{key: MetricResultRead.from_result(value) for key, value in metrics.items()}
    )

    baseline = baselines_repository.get_current_baseline(db, ctx.organization_id)
    revenue_vs_baseline: PeriodComparisonRead | None = None
    profit_vs_baseline: PeriodComparisonRead | None = None
    if baseline is not None:
        revenue_vs_baseline = PeriodComparisonRead.from_comparison(
            compare_periods(baseline.revenue, metrics["revenue"].value)
        )
        profit_vs_baseline = PeriodComparisonRead.from_comparison(
            compare_periods(baseline.profit, metrics["profit"].value)
        )

    org_read = OrganizationRead.model_validate(organization)
    org_read.my_role = ctx.role.value

    return BasicReportRead(
        organization=org_read,
        period=period,
        generated_at=datetime.now(UTC),
        dashboard=dashboard,
        revenue_vs_baseline=revenue_vs_baseline,
        profit_vs_baseline=profit_vs_baseline,
    )
