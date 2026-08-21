"""app/modules/analytics/service.py e puro (nao toca banco): os modelos
SQLAlchemy usados aqui sao construidos em memoria, sem sessao/commit.
"""

from app.models.financial_period import FinancialPeriod
from app.models.funnel_snapshot import FunnelSnapshot
from app.modules.analytics.service import compute_dashboard_metrics


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
