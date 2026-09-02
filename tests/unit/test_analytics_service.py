"""app/modules/analytics/service.py e puro (nao toca banco): os modelos
SQLAlchemy usados aqui sao construidos em memoria, sem sessao/commit.
"""

from datetime import date

from app.models.financial_period import FinancialPeriod
from app.models.funnel_snapshot import FunnelSnapshot
from app.modules.analytics.service import (
    aggregate_financials,
    aggregate_funnels,
    compute_dashboard_metrics,
    compute_monthly_series,
)


def test_dashboard_with_full_data():
    financial = FinancialPeriod(revenue=10000, costs=3000, expenses=1000, marketing_investment=2000)
    funnel = FunnelSnapshot(leads=100, customers=20, repeat_purchases=5)

    metrics = compute_dashboard_metrics(financial, funnel)

    assert metrics["revenue"].value == 10000
    assert metrics["profit"].value == 6000
    assert metrics["margin"].value == 0.6
    assert metrics["cac"].value == 100  # 2000 / 20
    assert metrics["conversion_rate"].value == 0.2  # 20 / 100
    assert metrics["average_ticket"].value == 500  # 10000 / 20
    assert metrics["recurrence_rate"].value == 0.25  # 5 / 20


def test_dashboard_without_any_data_is_not_applicable_everywhere():
    metrics = compute_dashboard_metrics(financial=None, funnel=None)

    for key, result in metrics.items():
        assert result.is_applicable is False, f"{key} deveria ser nao aplicavel sem dados"
        assert result.value is None


def test_dashboard_without_new_customers_never_divides_by_zero():
    financial = FinancialPeriod(revenue=5000, marketing_investment=1000)
    funnel = FunnelSnapshot(leads=50, customers=0)

    metrics = compute_dashboard_metrics(financial, funnel)

    assert metrics["cac"].is_applicable is False
    assert "divisao por zero" in (metrics["cac"].reason or "")
    assert metrics["average_ticket"].is_applicable is False
    assert metrics["conversion_rate"].value == 0.0  # 0 leads convertidos e valido, nao "nao aplicavel"


def test_aggregate_financials_sums_multiple_periods():
    periods = [
        FinancialPeriod(revenue=10000, costs=3000, expenses=1000, marketing_investment=2000, taxes=500),
        FinancialPeriod(revenue=12000, costs=3500, expenses=1200, marketing_investment=2500, taxes=600),
    ]
    aggregated = aggregate_financials(periods)
    assert aggregated.revenue == 22000
    assert aggregated.costs == 6500
    assert aggregated.expenses == 2200
    assert aggregated.marketing_investment == 4500
    assert aggregated.taxes == 1100


def test_aggregate_financials_empty_list_is_missing_everywhere():
    aggregated = aggregate_financials([])
    assert aggregated.revenue is None
    assert aggregated.costs is None


def test_aggregate_financials_sums_only_present_values_never_treats_missing_as_zero():
    # Um mes sem `taxes` registrado nao deve fazer a soma "zerar" — o mes
    # com dado (300) deve prevalecer, nao (300 + 0).
    periods = [
        FinancialPeriod(revenue=1000, taxes=300),
        FinancialPeriod(revenue=2000, taxes=None),
    ]
    aggregated = aggregate_financials(periods)
    assert aggregated.revenue == 3000
    assert aggregated.taxes == 300


def test_aggregate_funnels_sums_multiple_snapshots():
    # As 8 colunas, nao so leads/customers/repeat_purchases — antes desta
    # correcao, impressions/visits/mqls/sqls/opportunities eram descartados
    # silenciosamente ao agregar varios meses (ver AggregatedFunnel).
    snapshots = [
        FunnelSnapshot(
            impressions=1000, visits=400, leads=50, mqls=30, sqls=20, opportunities=15,
            customers=10, repeat_purchases=2,
        ),
        FunnelSnapshot(
            impressions=1200, visits=500, leads=60, mqls=35, sqls=25, opportunities=18,
            customers=15, repeat_purchases=3,
        ),
    ]
    aggregated = aggregate_funnels(snapshots)
    assert aggregated.impressions == 2200
    assert aggregated.visits == 900
    assert aggregated.leads == 110
    assert aggregated.mqls == 65
    assert aggregated.sqls == 45
    assert aggregated.opportunities == 33
    assert aggregated.customers == 25
    assert aggregated.repeat_purchases == 5


def test_aggregate_funnels_ignores_absence_never_treats_as_zero():
    # RN-003: mes sem dado numa etapa nunca vira 0 na soma — so soma o que
    # existe; None so quando NENHUM snapshot tem aquela etapa.
    snapshots = [FunnelSnapshot(impressions=1000, visits=None), FunnelSnapshot(impressions=None, visits=None)]
    aggregated = aggregate_funnels(snapshots)
    assert aggregated.impressions == 1000
    assert aggregated.visits is None


def test_compute_dashboard_metrics_accepts_aggregated_dataclasses():
    # AggregatedFinancials/AggregatedFunnel tem os mesmos nomes de campo dos
    # models — devem funcionar sem alteracao em compute_dashboard_metrics.
    financial = aggregate_financials(
        [FinancialPeriod(revenue=10000, costs=3000, expenses=1000, marketing_investment=2000)]
    )
    funnel = aggregate_funnels([FunnelSnapshot(leads=100, customers=20, repeat_purchases=5)])

    metrics = compute_dashboard_metrics(financial, funnel)

    assert metrics["revenue"].value == 10000
    assert metrics["profit"].value == 6000
    assert metrics["cac"].value == 100


def test_compute_monthly_series_has_one_point_per_calendar_month():
    financials = [FinancialPeriod(period=date(2026, 6, 1), revenue=10000)]
    funnels: list[FunnelSnapshot] = []

    series = compute_monthly_series(date(2026, 6, 1), date(2026, 8, 31), financials, funnels)

    assert [point.period for point in series] == [date(2026, 6, 1), date(2026, 7, 1), date(2026, 8, 1)]


def test_compute_monthly_series_uses_each_months_own_data_not_a_running_total():
    financials = [
        FinancialPeriod(period=date(2026, 6, 1), revenue=10000),
        FinancialPeriod(period=date(2026, 7, 1), revenue=12000),
    ]
    funnels: list[FunnelSnapshot] = []

    series = compute_monthly_series(date(2026, 6, 1), date(2026, 7, 31), financials, funnels)

    assert series[0].metrics["revenue"].value == 10000
    assert series[1].metrics["revenue"].value == 12000  # nao 22000 — nao e acumulado


def test_compute_monthly_series_month_without_data_is_not_applicable_but_not_omitted():
    # Mes do meio sem financial_period: aparece na lista (nunca "pulado"),
    # com is_applicable=False — o grafico precisa do buraco (RN-003).
    financials = [
        FinancialPeriod(period=date(2026, 6, 1), revenue=10000),
        FinancialPeriod(period=date(2026, 8, 1), revenue=15000),
    ]
    funnels: list[FunnelSnapshot] = []

    series = compute_monthly_series(date(2026, 6, 1), date(2026, 8, 31), financials, funnels)

    assert len(series) == 3
    assert series[1].period == date(2026, 7, 1)
    assert series[1].metrics["revenue"].is_applicable is False
    assert series[1].metrics["revenue"].value is None
