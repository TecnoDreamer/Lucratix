"""app/modules/analytics/targets_service.py e puro — recebe `Target` ja
construidos em memoria, sem sessao/commit."""

from datetime import date

from app.models.target import Target, TargetMetric
from app.modules.analytics.targets_service import aggregate_target_progress, monthly_targets_by_period


def _target(metric: TargetMetric, period: date, value: float) -> Target:
    return Target(metric=metric, period=period, value=value)


class TestAggregateTargetProgress:
    def test_revenue_sums_targets_across_months(self):
        targets = [
            _target(TargetMetric.REVENUE, date(2026, 6, 1), 50000),
            _target(TargetMetric.REVENUE, date(2026, 7, 1), 55000),
        ]
        result = aggregate_target_progress(TargetMetric.REVENUE, targets, current_value=94500)
        assert result.target_value == 105000
        assert result.percent_of_target.is_applicable is True
        assert result.percent_of_target.value == 94500 / 105000

    def test_profit_is_also_summable(self):
        targets = [_target(TargetMetric.PROFIT, date(2026, 6, 1), 20000)]
        result = aggregate_target_progress(TargetMetric.PROFIT, targets, current_value=18000)
        assert result.target_value == 20000

    def test_no_target_set_is_not_applicable_not_zero(self):
        result = aggregate_target_progress(TargetMetric.REVENUE, targets=[], current_value=94500)
        assert result.target_value is None
        assert result.percent_of_target.is_applicable is False

    def test_ratio_metrics_never_aggregate_even_with_targets_present(self):
        # CAC e uma razao (investimento/clientes) — somar a meta mensal nao
        # representa "a meta do intervalo" (mesmo problema de somar 5 CACs
        # mensais sem pesar pelo volume de cada mes).
        targets = [
            _target(TargetMetric.CAC, date(2026, 6, 1), 100),
            _target(TargetMetric.CAC, date(2026, 7, 1), 120),
        ]
        result = aggregate_target_progress(TargetMetric.CAC, targets, current_value=110)
        assert result.target_value is None
        assert result.percent_of_target.is_applicable is False
        assert "razão" in (result.percent_of_target.reason or "")

    def test_all_five_ratio_metrics_are_not_summable(self):
        for metric in (
            TargetMetric.MARGIN,
            TargetMetric.CAC,
            TargetMetric.CONVERSION_RATE,
            TargetMetric.AVERAGE_TICKET,
            TargetMetric.RECURRENCE_RATE,
        ):
            result = aggregate_target_progress(metric, targets=[], current_value=1)
            assert result.target_value is None, metric

    def test_filters_targets_by_the_requested_metric_only(self):
        targets = [
            _target(TargetMetric.REVENUE, date(2026, 6, 1), 50000),
            _target(TargetMetric.PROFIT, date(2026, 6, 1), 20000),
        ]
        result = aggregate_target_progress(TargetMetric.REVENUE, targets, current_value=45000)
        assert result.target_value == 50000


class TestMonthlyTargetsByPeriod:
    def test_groups_by_period_then_metric(self):
        targets = [
            _target(TargetMetric.REVENUE, date(2026, 6, 1), 50000),
            _target(TargetMetric.CAC, date(2026, 6, 1), 100),
            _target(TargetMetric.REVENUE, date(2026, 7, 1), 55000),
        ]
        by_period = monthly_targets_by_period(targets)
        assert by_period[date(2026, 6, 1)] == {"revenue": 50000, "cac": 100}
        assert by_period[date(2026, 7, 1)] == {"revenue": 55000}

    def test_empty_list_yields_empty_dict(self):
        assert monthly_targets_by_period([]) == {}
