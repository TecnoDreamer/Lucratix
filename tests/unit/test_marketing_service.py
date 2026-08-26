"""app/modules/analytics/marketing_service.py e puro (nao toca banco)."""

from app.models.campaign import Campaign
from app.modules.analytics.marketing_service import (
    aggregate_campaigns,
    compute_marketing_metrics,
)


def test_aggregate_campaigns_sums_multiple_campaigns():
    campaigns = [
        Campaign(investment=1000, impressions=10000, clicks=500, leads=50, customers=10, attributed_revenue=4000),
        Campaign(investment=1500, impressions=20000, clicks=800, leads=70, customers=15, attributed_revenue=6000),
    ]
    aggregated = aggregate_campaigns(campaigns)
    assert aggregated.investment == 2500
    assert aggregated.impressions == 30000
    assert aggregated.clicks == 1300
    assert aggregated.leads == 120
    assert aggregated.customers == 25
    assert aggregated.attributed_revenue == 10000


def test_aggregate_campaigns_empty_list_is_missing_everywhere():
    aggregated = aggregate_campaigns([])
    assert aggregated.investment is None
    assert aggregated.attributed_revenue is None


def test_aggregate_campaigns_never_treats_missing_as_zero():
    campaigns = [
        Campaign(investment=1000, clicks=100),
        Campaign(investment=2000, clicks=None),
    ]
    aggregated = aggregate_campaigns(campaigns)
    assert aggregated.investment == 3000
    assert aggregated.clicks == 100


def test_compute_marketing_metrics_with_full_data():
    campaigns = [
        Campaign(
            investment=1000,
            impressions=10000,
            clicks=500,
            leads=50,
            customers=10,
            attributed_revenue=4000,
        )
    ]
    metrics = compute_marketing_metrics(aggregate_campaigns(campaigns))

    assert metrics["roas"].value == 4.0
    assert metrics["roi"].value == 3.0  # (4000-1000)/1000
    assert metrics["ctr"].value == 0.05  # 500/10000
    assert metrics["cpc"].value == 2.0  # 1000/500
    assert metrics["cpm"].value == 100.0  # (1000/10000)*1000
    assert metrics["cpl"].value == 20.0  # 1000/50
    assert metrics["cpa"].value == 100.0  # 1000/10


def test_compute_marketing_metrics_without_any_campaign_is_not_applicable():
    metrics = compute_marketing_metrics(aggregate_campaigns([]))
    for key, result in metrics.items():
        assert result.is_applicable is False, f"{key} deveria ser nao aplicavel sem campanhas"
        assert result.value is None


def test_compute_marketing_metrics_zero_investment_never_divides_by_zero():
    campaigns = [Campaign(investment=0, attributed_revenue=1000, clicks=10, impressions=100)]
    metrics = compute_marketing_metrics(aggregate_campaigns(campaigns))

    assert metrics["roas"].is_applicable is False
    assert metrics["roi"].is_applicable is False
    assert metrics["ctr"].value == 0.1  # nao depende de investimento, continua valido
