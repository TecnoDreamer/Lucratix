import uuid
from collections import defaultdict
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.api_key_auth import require_role_or_api_key
from app.core.database import get_db
from app.core.deps import OrganizationContext, get_organization_context, require_role
from app.models.campaign import Campaign
from app.models.funnel_snapshot import FunnelSnapshot
from app.models.membership import MembershipRole
from app.models.target import TargetMetric
from app.modules.analytics.correlation_service import compute_correlation
from app.modules.analytics.date_ranges import months_between, months_in_range, previous_equivalent_range
from app.modules.analytics.funnel_analytics import compute_stage_conversions, stage_values
from app.modules.analytics.marketing_service import aggregate_campaigns, compute_marketing_metrics
from app.modules.analytics.service import (
    aggregate_financials,
    aggregate_funnels,
    compute_dashboard_metrics,
    compute_monthly_series,
)
from app.modules.analytics.targets_service import aggregate_target_progress, monthly_targets_by_period
from app.modules.baselines import repository as baselines_repository
from app.modules.financials import repository as financials_repository
from app.modules.funnels import repository as funnels_repository
from app.modules.marketing import repository as marketing_repository
from app.modules.metrics.engine import compare_periods
from app.modules.targets import repository as targets_repository
from app.schemas.metrics import (
    ChannelFunnelRead,
    ChannelMarketingRead,
    CorrelationPointRead,
    DashboardRead,
    ExecutiveCorrelationRead,
    ExecutiveDashboardRead,
    ExecutiveSeriesRead,
    ExecutiveTargetsRead,
    FunnelAnalyticsRead,
    FunnelByChannelRead,
    FunnelSeriesRead,
    FunnelStagesRead,
    MarketingAnalyticsRead,
    MarketingByChannelRead,
    MetricResultRead,
    MetricWithComparisonRead,
    MonthlyFunnelStagesRead,
    MonthlyMetricsRead,
    MonthlyTargetRead,
    PeriodComparisonRead,
    StageConversionRead,
    StageConversionWithComparisonRead,
    TargetProgressRead,
)

router = APIRouter(prefix="/api/v1/organizations/{organization_id}", tags=["analytics"])

# Decisao confirmada com o usuario em 2026-08-27, tela por tela (RN-010 dizia
# que VIEWER ve dashboard/relatorios; a auditoria de BI queria ANALYST+ em
# tudo — nenhuma das duas valia sozinha, o usuario decidiu por tela):
# - /dashboard e /dashboard/compare-to-baseline: VIEWER continua vendo (RN-010
#   original, sem mudanca).
# - /analytics/executive e /analytics/marketing: ANALYST+ apenas.
# Ver docs/requirements/business-rules.md, RN-010.

_BaselineMetric = Literal["revenue", "profit", "margin", "cac"]
_CorrelationMetric = Literal[
    "revenue", "profit", "margin", "cac", "conversion_rate", "average_ticket", "recurrence_rate"
]
_DASHBOARD_METRIC_KEYS = (
    "revenue",
    "profit",
    "margin",
    "cac",
    "conversion_rate",
    "average_ticket",
    "recurrence_rate",
)
_MARKETING_METRIC_KEYS = ("roas", "roi", "ctr", "cpc", "cpm", "cpl", "cpa")


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


@router.get("/analytics/executive")
def get_executive_dashboard(
    date_from: date,
    date_to: date,
    ctx: OrganizationContext = Depends(require_role_or_api_key(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ExecutiveDashboardRead:
    """RF-023, secoes 5-7 do prompt de BI: visao executiva por intervalo de
    datas arbitrario (nao so um mes de calendario), com cada KPI comparado
    contra o periodo anterior equivalente de mesma duracao.
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    financials = financials_repository.list_financial_periods_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    funnels = funnels_repository.list_funnel_snapshots_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    current_metrics = compute_dashboard_metrics(
        aggregate_financials(financials), aggregate_funnels(funnels)
    )

    previous_date_from, previous_date_to = previous_equivalent_range(date_from, date_to)
    previous_financials = financials_repository.list_financial_periods_in_range(
        db, ctx.organization_id, previous_date_from, previous_date_to
    )
    previous_funnels = funnels_repository.list_funnel_snapshots_in_range(
        db, ctx.organization_id, previous_date_from, previous_date_to
    )
    previous_metrics = compute_dashboard_metrics(
        aggregate_financials(previous_financials), aggregate_funnels(previous_funnels)
    )

    metrics_with_comparison = {
        key: MetricWithComparisonRead(
            current=MetricResultRead.from_result(current_metrics[key]),
            comparison=PeriodComparisonRead.from_comparison(
                compare_periods(previous_metrics[key].value, current_metrics[key].value)
            ),
        )
        for key in _DASHBOARD_METRIC_KEYS
    }

    return ExecutiveDashboardRead(
        date_from=date_from,
        date_to=date_to,
        previous_date_from=previous_date_from,
        previous_date_to=previous_date_to,
        months_in_range=months_in_range(date_from, date_to),
        months_with_financial_data=len(financials),
        months_with_funnel_data=len(funnels),
        **metrics_with_comparison,
    )


@router.get("/analytics/executive/series")
def get_executive_series(
    date_from: date,
    date_to: date,
    ctx: OrganizationContext = Depends(require_role_or_api_key(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ExecutiveSeriesRead:
    """Serie mensal dos mesmos 7 KPIs de `/analytics/executive`, um ponto por
    mes de calendario tocado pelo intervalo — para os graficos de evolucao
    da Visao Executiva. Mesma permissao do endpoint agregado (ANALYST+): e o
    mesmo dado, so que detalhado por mes em vez de somado.
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    financials = financials_repository.list_financial_periods_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    funnels = funnels_repository.list_funnel_snapshots_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    monthly = compute_monthly_series(date_from, date_to, financials, funnels)

    return ExecutiveSeriesRead(
        date_from=date_from,
        date_to=date_to,
        points=[
            MonthlyMetricsRead(
                period=point.period,
                **{
                    key: MetricResultRead.from_result(point.metrics[key])
                    for key in _DASHBOARD_METRIC_KEYS
                },
            )
            for point in monthly
        ],
    )


@router.get("/analytics/executive/targets")
def get_executive_targets(
    date_from: date,
    date_to: date,
    ctx: OrganizationContext = Depends(require_role_or_api_key(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ExecutiveTargetsRead:
    """Progresso em relacao a meta (`targets`) — mesma permissao dos outros
    endpoints executivos (ANALYST+). Receita/lucro tem progresso agregado
    pro intervalo inteiro (metricas aditivas); as outras 5 metricas (razoes)
    so tem meta comparavel mes a mes, devolvida em `monthly` — ver
    `analytics/targets_service.py`.
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    targets = targets_repository.list_targets_in_range(db, ctx.organization_id, date_from, date_to)

    financials = financials_repository.list_financial_periods_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    funnels = funnels_repository.list_funnel_snapshots_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    current_metrics = compute_dashboard_metrics(
        aggregate_financials(financials), aggregate_funnels(funnels)
    )

    progress = {}
    for key in _DASHBOARD_METRIC_KEYS:
        result = aggregate_target_progress(TargetMetric(key), targets, current_metrics[key].value)
        progress[key] = TargetProgressRead(
            target_value=result.target_value,
            percent_of_target=MetricResultRead.from_result(result.percent_of_target),
        )

    by_period = monthly_targets_by_period(targets)
    monthly = [
        MonthlyTargetRead(
            period=month,
            **{key: by_period.get(month, {}).get(key) for key in _DASHBOARD_METRIC_KEYS},
        )
        for month in months_between(date_from, date_to)
    ]

    return ExecutiveTargetsRead(date_from=date_from, date_to=date_to, monthly=monthly, **progress)


@router.get("/analytics/executive/correlation")
def get_executive_correlation(
    date_from: date,
    date_to: date,
    metric_x: _CorrelationMetric,
    metric_y: _CorrelationMetric,
    ctx: OrganizationContext = Depends(require_role_or_api_key(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> ExecutiveCorrelationRead:
    """Correlacao de Pearson entre duas metricas mensais da Visao Executiva
    — nao depende de dado novo, reaproveita a mesma serie mensal de
    `/analytics/executive/series` (`compute_monthly_series`). Mesma
    permissao dos outros endpoints executivos (ANALYST+).
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )
    if metric_x == metric_y:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="metric_x e metric_y precisam ser metricas diferentes",
        )

    financials = financials_repository.list_financial_periods_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    funnels = funnels_repository.list_funnel_snapshots_in_range(
        db, ctx.organization_id, date_from, date_to
    )
    monthly = compute_monthly_series(date_from, date_to, financials, funnels)

    correlation_result, points = compute_correlation(monthly, metric_x, metric_y)
    months_used = sum(1 for p in points if p.x is not None and p.y is not None)

    return ExecutiveCorrelationRead(
        date_from=date_from,
        date_to=date_to,
        metric_x=metric_x,
        metric_y=metric_y,
        months_used=months_used,
        correlation=MetricResultRead.from_result(correlation_result),
        points=[CorrelationPointRead(period=p.period, x=p.x, y=p.y) for p in points],
    )


@router.get("/analytics/marketing")
def get_marketing_analytics(
    date_from: date,
    date_to: date,
    ctx: OrganizationContext = Depends(require_role_or_api_key(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> MarketingAnalyticsRead:
    """Métricas de campanha (ROAS, ROI, CTR, CPC, CPM, CPL, CPA) por
    intervalo de datas — dado já existente em `campaigns`, sem endpoint
    próprio até agora (ver docs/auditoria/AUDITORIA_BI_RELATORIOS.md).
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    campaigns = marketing_repository.list_campaigns_in_range(db, ctx.organization_id, date_from, date_to)
    current_metrics = compute_marketing_metrics(aggregate_campaigns(campaigns))

    previous_date_from, previous_date_to = previous_equivalent_range(date_from, date_to)
    previous_campaigns = marketing_repository.list_campaigns_in_range(
        db, ctx.organization_id, previous_date_from, previous_date_to
    )
    previous_metrics = compute_marketing_metrics(aggregate_campaigns(previous_campaigns))

    metrics_with_comparison = {
        key: MetricWithComparisonRead(
            current=MetricResultRead.from_result(current_metrics[key]),
            comparison=PeriodComparisonRead.from_comparison(
                compare_periods(previous_metrics[key].value, current_metrics[key].value)
            ),
        )
        for key in _MARKETING_METRIC_KEYS
    }

    return MarketingAnalyticsRead(
        date_from=date_from,
        date_to=date_to,
        previous_date_from=previous_date_from,
        previous_date_to=previous_date_to,
        campaign_count=len(campaigns),
        **metrics_with_comparison,
    )


@router.get("/analytics/marketing/by-channel")
def get_marketing_by_channel(
    date_from: date,
    date_to: date,
    ctx: OrganizationContext = Depends(require_role_or_api_key(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> MarketingByChannelRead:
    """Drill-down de `/analytics/marketing` por canal — mesmas 7 metricas,
    cada uma agregada so das campanhas daquele canal em vez de todas juntas.
    Mesma permissao e mesmo criterio de campanha incluida do endpoint
    agregado. Sem comparacao com periodo anterior nesta primeira versao
    (o eixo aqui e "canal A vs. canal B", nao "antes vs. depois") — `campaigns.
    channel_id` (RESTRICT na FK) garante que todo canal referenciado por uma
    campanha continua existindo, entao a resolucao de nome nunca falha.
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    campaigns = marketing_repository.list_campaigns_in_range(db, ctx.organization_id, date_from, date_to)

    campaigns_by_channel: dict[uuid.UUID, list[Campaign]] = defaultdict(list)
    for campaign in campaigns:
        campaigns_by_channel[campaign.channel_id].append(campaign)

    channels_by_id = marketing_repository.get_channels_by_ids(
        db, ctx.organization_id, set(campaigns_by_channel.keys())
    )

    channels = []
    for channel_id, channel_campaigns in campaigns_by_channel.items():
        metrics = compute_marketing_metrics(aggregate_campaigns(channel_campaigns))
        channel = channels_by_id.get(channel_id)
        channels.append(
            ChannelMarketingRead(
                channel_id=channel_id,
                channel_name=channel.name if channel else "Canal removido",
                campaign_count=len(channel_campaigns),
                **{key: MetricResultRead.from_result(metrics[key]) for key in _MARKETING_METRIC_KEYS},
            )
        )
    channels.sort(key=lambda c: c.channel_name)

    return MarketingByChannelRead(date_from=date_from, date_to=date_to, channels=channels)


@router.get("/analytics/funnel")
def get_funnel_analytics(
    date_from: date,
    date_to: date,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> FunnelAnalyticsRead:
    """Funil agregado (todos os canais juntos) num intervalo de datas: as 8
    etapas e as 7 conversoes/abandonos etapa-a-etapa, com a taxa de
    conversao de cada etapa comparada ao periodo anterior equivalente.
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    snapshots = funnels_repository.list_funnel_snapshots_in_range(db, ctx.organization_id, date_from, date_to)
    current_funnel = aggregate_funnels(snapshots)
    current_conversions = compute_stage_conversions(current_funnel)

    previous_date_from, previous_date_to = previous_equivalent_range(date_from, date_to)
    previous_snapshots = funnels_repository.list_funnel_snapshots_in_range(
        db, ctx.organization_id, previous_date_from, previous_date_to
    )
    previous_conversions = compute_stage_conversions(aggregate_funnels(previous_snapshots))

    conversions = [
        StageConversionWithComparisonRead(
            from_stage=current.from_stage,
            to_stage=current.to_stage,
            conversion_rate=MetricResultRead.from_result(current.conversion_rate),
            drop_off_rate=MetricResultRead.from_result(current.drop_off_rate),
            conversion_rate_comparison=PeriodComparisonRead.from_comparison(
                compare_periods(previous.conversion_rate.value, current.conversion_rate.value)
            ),
        )
        for current, previous in zip(current_conversions, previous_conversions, strict=True)
    ]

    return FunnelAnalyticsRead(
        date_from=date_from,
        date_to=date_to,
        previous_date_from=previous_date_from,
        previous_date_to=previous_date_to,
        stages=FunnelStagesRead.from_stage_values(stage_values(current_funnel)),
        conversions=conversions,
    )


@router.get("/analytics/funnel/by-channel")
def get_funnel_by_channel(
    date_from: date,
    date_to: date,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> FunnelByChannelRead:
    """Drill-down de /analytics/funnel por canal — mesmas etapas/conversoes,
    cada uma calculada so com os snapshots daquele canal. Sem comparacao com
    periodo anterior nesta primeira versao (o eixo aqui e "canal A vs. canal
    B", igual a /analytics/marketing/by-channel). channel_id (RESTRICT na
    FK) garante que todo canal referenciado por um snapshot continua
    existindo, entao a resolucao de nome nunca falha.
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    snapshots = funnels_repository.list_channel_funnel_snapshots_in_range(
        db, ctx.organization_id, date_from, date_to
    )

    snapshots_by_channel: dict[uuid.UUID, list[FunnelSnapshot]] = defaultdict(list)
    for snapshot in snapshots:
        # list_channel_funnel_snapshots_in_range ja filtra channel_id IS NOT
        # NULL — o assert so satisfaz o tipo (Mapped[uuid.UUID | None]) sem
        # reintroduzir a checagem em runtime de verdade.
        assert snapshot.channel_id is not None
        snapshots_by_channel[snapshot.channel_id].append(snapshot)

    channels_by_id = marketing_repository.get_channels_by_ids(
        db, ctx.organization_id, set(snapshots_by_channel.keys())
    )

    channels = []
    for channel_id, channel_snapshots in snapshots_by_channel.items():
        funnel = aggregate_funnels(channel_snapshots)
        channel = channels_by_id.get(channel_id)
        channels.append(
            ChannelFunnelRead(
                channel_id=channel_id,
                channel_name=channel.name if channel else "Canal removido",
                stages=FunnelStagesRead.from_stage_values(stage_values(funnel)),
                conversions=[
                    StageConversionRead.from_stage_conversion(c) for c in compute_stage_conversions(funnel)
                ],
            )
        )
    channels.sort(key=lambda c: c.channel_name)

    return FunnelByChannelRead(date_from=date_from, date_to=date_to, channels=channels)


@router.get("/analytics/funnel/series")
def get_funnel_series(
    date_from: date,
    date_to: date,
    ctx: OrganizationContext = Depends(require_role(MembershipRole.ANALYST)),
    db: Session = Depends(get_db),
) -> FunnelSeriesRead:
    """Serie mensal do funil agregado (channel_id IS NULL), um ponto por mes
    de calendario tocado pelo intervalo — para o grafico de evolucao
    temporal. Mesma permissao de /analytics/funnel: e o mesmo dado, so que
    detalhado por mes em vez de somado.
    """
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from nao pode ser posterior a date_to",
        )

    snapshots = funnels_repository.list_funnel_snapshots_in_range(db, ctx.organization_id, date_from, date_to)
    snapshots_by_month = {s.period: s for s in snapshots}

    return FunnelSeriesRead(
        date_from=date_from,
        date_to=date_to,
        points=[
            MonthlyFunnelStagesRead(
                period=month,
                stages=FunnelStagesRead.from_stage_values(stage_values(snapshots_by_month.get(month))),
            )
            for month in months_between(date_from, date_to)
        ],
    )
