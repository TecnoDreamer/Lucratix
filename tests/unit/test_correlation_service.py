"""app/modules/analytics/correlation_service.py é puro — recebe
MonthlyMetrics já construídos em memória."""

from datetime import date

from app.modules.analytics.correlation_service import compute_correlation
from app.modules.analytics.service import MonthlyMetrics
from app.modules.metrics.engine import MetricResult


def _month(period: date, **metrics: float | None) -> MonthlyMetrics:
    return MonthlyMetrics(
        period=period,
        metrics={
            key: (MetricResult.ok(value) if value is not None else MetricResult.missing_data(key))
            for key, value in metrics.items()
        },
    )


class TestComputeCorrelation:
    def test_one_point_per_month_even_with_gaps(self):
        monthly = [
            _month(date(2026, 6, 1), revenue=10000, cac=100),
            _month(date(2026, 7, 1), revenue=None, cac=110),  # receita ausente em julho
            _month(date(2026, 8, 1), revenue=12000, cac=90),
        ]
        _, points = compute_correlation(monthly, "revenue", "cac")

        assert len(points) == 3
        assert points[1].x is None  # buraco preservado, nunca 0
        assert points[1].y == 110

    def test_correlation_only_uses_months_with_both_metrics_applicable(self):
        monthly = [
            _month(date(2026, 6, 1), revenue=10000, cac=150),
            _month(date(2026, 7, 1), revenue=None, cac=110),
            _month(date(2026, 8, 1), revenue=12000, cac=90),
            _month(date(2026, 9, 1), revenue=14000, cac=70),
        ]
        result, _ = compute_correlation(monthly, "revenue", "cac")

        # So 3 meses tem as duas metricas (jun/ago/set) — julho e excluido
        # do calculo, mesmo aparecendo em `points`.
        assert result.is_applicable is True

    def test_fewer_than_3_paired_months_is_not_applicable(self):
        monthly = [
            _month(date(2026, 6, 1), revenue=10000, cac=150),
            _month(date(2026, 7, 1), revenue=None, cac=110),
            _month(date(2026, 8, 1), revenue=12000, cac=90),
        ]
        result, _ = compute_correlation(monthly, "revenue", "cac")

        assert result.is_applicable is False

    def test_perfect_correlation_end_to_end(self):
        monthly = [
            _month(date(2026, 6, 1), revenue=10000, profit=4000),
            _month(date(2026, 7, 1), revenue=20000, profit=8000),
            _month(date(2026, 8, 1), revenue=30000, profit=12000),
        ]
        result, _ = compute_correlation(monthly, "revenue", "profit")

        assert result.value == 1.0
