from pydantic import BaseModel

from app.modules.metrics.engine import MetricResult, PeriodComparison


class MetricResultRead(BaseModel):
    value: float | None
    is_applicable: bool
    reason: str | None

    @classmethod
    def from_result(cls, result: MetricResult) -> "MetricResultRead":
        return cls(value=result.value, is_applicable=result.is_applicable, reason=result.reason)


class DashboardRead(BaseModel):
    revenue: MetricResultRead
    profit: MetricResultRead
    margin: MetricResultRead
    cac: MetricResultRead
    conversion_rate: MetricResultRead
    average_ticket: MetricResultRead
    recurrence_rate: MetricResultRead


class PeriodComparisonRead(BaseModel):
    baseline_value: float | None
    current_value: float | None
    absolute_change: float | None
    percent_change: float | None

    @classmethod
    def from_comparison(cls, comparison: PeriodComparison) -> "PeriodComparisonRead":
        return cls(
            baseline_value=comparison.baseline_value,
            current_value=comparison.current_value,
            absolute_change=comparison.absolute_change,
            percent_change=comparison.percent_change,
        )
