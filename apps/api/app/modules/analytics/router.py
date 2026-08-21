from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context
from app.modules.analytics.service import compute_dashboard_metrics
from app.modules.baselines import repository as baselines_repository
from app.modules.financials import repository as financials_repository
from app.modules.funnels import repository as funnels_repository
from app.modules.metrics.engine import compare_periods
from app.schemas.metrics import DashboardRead, MetricResultRead, PeriodComparisonRead

router = APIRouter(prefix="/api/v1/organizations/{organization_id}", tags=["analytics"])

_BaselineMetric = Literal["revenue", "profit", "margin", "cac"]


@router.get("/dashboard")
def get_dashboard(
    period: date,
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> DashboardRead:
    financial = financials_repository.get_financial_period(db, ctx.organization_id, period)
    funnel = funnels_repository.get_funnel_snapshot(db, ctx.organization_id, period)

    metrics = compute_dashboard_metrics(financial, funnel)
    return DashboardRead(**{key: MetricResultRead.from_result(value) for key, value in metrics.items()})


@router.get("/dashboard/compare-to-baseline")
def compare_to_baseline(
    period: date,
    metric: _BaselineMetric,
    ctx: OrganizationContext = Depends(get_organization_context),
    db: Session = Depends(get_db),
) -> PeriodComparisonRead:
    """RF-022, RN-007: compara uma metrica do periodo informado contra o
    baseline vigente da organizacao (o registro mais recente — ADR-0005).
    Nao afirma causalidade; apenas a variacao observada.
    """
    baseline = baselines_repository.get_current_baseline(db, ctx.organization_id)
    if baseline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organizacao ainda nao possui baseline registrado",
        )

    financial = financials_repository.get_financial_period(db, ctx.organization_id, period)
    funnel = funnels_repository.get_funnel_snapshot(db, ctx.organization_id, period)
    current_metrics = compute_dashboard_metrics(financial, funnel)

    baseline_value = getattr(baseline, metric)
    current_value = current_metrics[metric].value

    comparison = compare_periods(baseline_value, current_value)
    return PeriodComparisonRead.from_comparison(comparison)
