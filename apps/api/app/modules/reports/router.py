"""RF-026: relatorio basico. Composicao fina sobre modulos ja existentes
(organizations, baselines, financials, funnels, metrics) — nao introduz
nenhuma regra de negocio nova.
"""

import uuid
from collections import defaultdict
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import OrganizationContext, require_role
from app.models.funnel_snapshot import FunnelSnapshot
from app.models.membership import MembershipRole
from app.modules.analytics.date_ranges import month_end, months_between, previous_equivalent_range
from app.modules.analytics.funnel_analytics import compute_stage_conversions, stage_values
from app.modules.analytics.marketing_service import aggregate_campaigns, compute_marketing_metrics
from app.modules.analytics.service import aggregate_funnels, compute_dashboard_metrics
from app.modules.baselines import repository as baselines_repository
from app.modules.financials import repository as financials_repository
from app.modules.funnels import repository as funnels_repository
from app.modules.marketing import repository as marketing_repository
from app.modules.metrics.engine import compare_periods
from app.modules.organizations import repository as organizations_repository
from app.modules.reports.basic_pdf import build_basic_report
from app.modules.reports.funnel_pdf import ChannelReportData, build_funnel_report
from app.schemas.metrics import DashboardRead, MetricResultRead, PeriodComparisonRead
from app.schemas.organization import OrganizationRead
from app.schemas.report import BasicReportRead

router = APIRouter(prefix="/api/v1/organizations/{organization_id}/reports", tags=["reports"])


@router.get("/basic")
def get_basic_report(
    period: date,
    # ANALYST+ apenas — decisao confirmada com o usuario em 2026-08-27, ver
    # docs/requirements/business-rules.md, RN-010.
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
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


@router.get("/basic/pdf")
def get_basic_report_pdf(
    period: date,
    # Mesma permissao de /reports/basic — e o mesmo dado, so que em PDF, nao
    # um nivel de acesso novo (PR4, mesmo criterio da PR3).
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> Response:
    """Relatorio Basico (RF-026) em PDF, gerado no servidor — PR4 (adocao do
    padrao de PDF da PR3 em outra tela, ver docs/reports/PR4_INVENTARIO.md).
    So compoe dado ja calculado pelas mesmas funcoes de /reports/basic e
    /analytics/marketing — nenhuma regra de negocio nova aqui.
    """
    organization = organizations_repository.get_organization(db, ctx.organization_id)
    assert organization is not None

    financial = financials_repository.get_financial_period(db, ctx.organization_id, period)
    funnel = funnels_repository.get_funnel_snapshot(db, ctx.organization_id, period)
    dashboard = compute_dashboard_metrics(financial, funnel)

    baseline = baselines_repository.get_current_baseline(db, ctx.organization_id)
    revenue_vs_baseline = None
    profit_vs_baseline = None
    if baseline is not None:
        revenue_vs_baseline = compare_periods(baseline.revenue, dashboard["revenue"].value)
        profit_vs_baseline = compare_periods(baseline.profit, dashboard["profit"].value)

    campaigns = marketing_repository.list_campaigns_in_range(
        db, ctx.organization_id, period, month_end(period)
    )
    marketing = compute_marketing_metrics(aggregate_campaigns(campaigns))

    pdf_bytes = build_basic_report(
        organization_name=organization.name,
        period=period,
        generated_at=datetime.now(UTC),
        dashboard=dashboard,
        revenue_vs_baseline=revenue_vs_baseline,
        profit_vs_baseline=profit_vs_baseline,
        marketing=marketing,
        campaign_count=len(campaigns),
    )

    record_audit(
        db,
        action="report.basic_pdf.downloaded",
        entity="report",
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()

    filename = f"relatorio_{period.isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/funnel/pdf")
def get_funnel_report_pdf(
    date_from: date,
    date_to: date,
    # Mesma permissao de /analytics/funnel — e o mesmo dado, so que em PDF,
    # nao um nivel de acesso novo.
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> Response:
    """Relatorio do Funil em PDF, gerado no servidor (RF do prompt de
    funil/graficos/PDF). So compoe dado ja calculado pelas mesmas funcoes
    de /analytics/funnel, /analytics/funnel/series e
    /analytics/funnel/by-channel — nenhuma regra de negocio nova aqui.
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    organization = organizations_repository.get_organization(db, ctx.organization_id)
    assert organization is not None

    current_snapshots = funnels_repository.list_funnel_snapshots_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    current_funnel = aggregate_funnels(current_snapshots)
    current_conversions = compute_stage_conversions(current_funnel)

    previous_date_from, previous_date_to = previous_equivalent_range(date_from, date_to)
    previous_snapshots = funnels_repository.list_funnel_snapshots_in_range(
        db, ctx.organization_id, previous_date_from, previous_date_to
    )
    previous_conversions = compute_stage_conversions(aggregate_funnels(previous_snapshots))

    snapshots_by_month = {s.period: s for s in current_snapshots}
    monthly_series = [
        (month, stage_values(snapshots_by_month.get(month))) for month in months_between(date_from, date_to)
    ]

    channel_snapshots = funnels_repository.list_channel_funnel_snapshots_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    snapshots_by_channel: dict[uuid.UUID, list[FunnelSnapshot]] = defaultdict(list)
    for snapshot in channel_snapshots:
        assert snapshot.channel_id is not None
        snapshots_by_channel[snapshot.channel_id].append(snapshot)
    channels_by_id = marketing_repository.get_channels_by_ids(
        db, ctx.organization_id, set(snapshots_by_channel.keys())
    )
    channels = []
    for channel_id, channel_rows in snapshots_by_channel.items():
        channel = channels_by_id.get(channel_id)
        aggregated_channel = aggregate_funnels(channel_rows)
        channels.append(
            ChannelReportData(
                channel_name=channel.name if channel else "Canal removido",
                stages=stage_values(aggregated_channel),
                conversions=compute_stage_conversions(aggregated_channel),
            )
        )
    channels.sort(key=lambda c: c.channel_name)

    pdf_bytes = build_funnel_report(
        organization_name=organization.name,
        date_from=date_from,
        date_to=date_to,
        generated_at=datetime.now(UTC),
        current_stages=stage_values(current_funnel),
        current_conversions=current_conversions,
        previous_conversions=previous_conversions,
        monthly_series=monthly_series,
        channels=channels,
    )

    record_audit(
        db,
        action="report.funnel_pdf.downloaded",
        entity="report",
        user_id=ctx.user.id,
        organization_id=ctx.organization_id,
    )
    db.commit()

    filename = f"funil_relatorio_{date_from.isoformat()}_{date_to.isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
