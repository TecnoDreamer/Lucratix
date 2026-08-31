"""RF-021, RN-003, RN-004 — motor de metricas.

Cada metrica e testada em tres cenarios: caminho feliz, dado ausente
(None) e divisao por zero — nunca podem levantar excecao nem retornar 0
silenciosamente quando o resultado nao e aplicavel.
"""

from decimal import Decimal

import pytest

from app.modules.metrics import engine


@pytest.mark.parametrize(
    "fn, args",
    [
        (engine.margin, (100, None)),
        (engine.cac, (None, 10)),
        (engine.roas, (None, 100)),
        (engine.roi, (None, 100)),
        (engine.conversion_rate, (None, 10)),
        (engine.average_ticket, (None, 10)),
        (engine.cpl, (None, 10)),
        (engine.cpa, (None, 10)),
        (engine.ctr, (None, 10)),
        (engine.cpc, (None, 10)),
        (engine.cpm, (None, 10)),
        (engine.retention_rate, (None, 10)),
        (engine.recurrence_rate, (None, 10)),
    ],
)
def test_ratio_metrics_missing_numerator_is_not_applicable(fn, args):
    result = fn(*args)
    assert result.is_applicable is False
    assert result.value is None
    assert "dado ausente" in (result.reason or "")


@pytest.mark.parametrize(
    "fn, args",
    [
        (engine.margin, (None, 100)),
        (engine.cac, (100, None)),
        (engine.roas, (100, None)),
        (engine.roi, (100, None)),
        (engine.conversion_rate, (10, None)),
        (engine.average_ticket, (10, None)),
        (engine.cpl, (10, None)),
        (engine.cpa, (10, None)),
        (engine.ctr, (10, None)),
        (engine.cpc, (10, None)),
        (engine.cpm, (10, None)),
        (engine.retention_rate, (10, None)),
        (engine.recurrence_rate, (10, None)),
    ],
)
def test_ratio_metrics_missing_denominator_is_not_applicable(fn, args):
    result = fn(*args)
    assert result.is_applicable is False
    assert result.value is None
    assert "dado ausente" in (result.reason or "")


@pytest.mark.parametrize(
    "fn, args",
    [
        (engine.margin, (0, 100)),
        (engine.cac, (100, 0)),
        (engine.roas, (100, 0)),
        (engine.roi, (100, 0)),
        (engine.conversion_rate, (10, 0)),
        (engine.average_ticket, (10, 0)),
        (engine.cpl, (10, 0)),
        (engine.cpa, (10, 0)),
        (engine.ctr, (10, 0)),
        (engine.cpc, (10, 0)),
        (engine.cpm, (10, 0)),
        (engine.retention_rate, (10, 0)),
        (engine.recurrence_rate, (10, 0)),
    ],
)
def test_ratio_metrics_never_divide_by_zero(fn, args):
    result = fn(*args)
    assert result.is_applicable is False
    assert result.value is None
    assert "divisao por zero" in (result.reason or "")


def test_margin_happy_path():
    result = engine.margin(revenue=1000, profit=600)
    assert result.is_applicable is True
    assert result.value == 0.6


def test_profit_sums_correctly_and_treats_missing_costs_as_zero_only_here():
    # profit() e o unico caso em que ausencia de custo/despesa/imposto vira 0
    # DELIBERADAMENTE (equivale a "sem custo lancado"), nao um dado numerico
    # cuja ausencia mude o significado de uma razao (diferente de RN-003/004
    # aplicado a denominadores). Receita ausente, porem, e sempre "nao aplicavel".
    result = engine.profit(revenue=1000, costs=300, expenses=None, taxes=None)
    assert result.is_applicable is True
    assert result.value == 700


def test_profit_without_revenue_is_not_applicable():
    result = engine.profit(revenue=None, costs=100, expenses=50, taxes=10)
    assert result.is_applicable is False


def test_cac_happy_path():
    result = engine.cac(marketing_investment=2000, new_customers=10)
    assert result.value == 200


def test_roas_happy_path():
    result = engine.roas(attributed_revenue=4000, investment=1000)
    assert result.value == 4.0


def test_roi_happy_path():
    result = engine.roi(attributed_revenue=4000, investment=1000)
    assert result.value == 3.0


def test_ltv_missing_any_factor_is_not_applicable():
    assert engine.ltv(None, 2, 3).is_applicable is False
    assert engine.ltv(100, None, 3).is_applicable is False
    assert engine.ltv(100, 2, None).is_applicable is False


def test_ltv_happy_path():
    result = engine.ltv(average_ticket=100, purchase_frequency=2, retention_time=3)
    assert result.value == 600


def test_churn_rate_derives_from_retention():
    result = engine.churn_rate(active_end=80, active_start=100)
    assert result.value == pytest.approx(0.2)


def test_churn_rate_propagates_not_applicable_from_retention():
    result = engine.churn_rate(active_end=80, active_start=0)
    assert result.is_applicable is False
    assert "divisao por zero" in (result.reason or "")


def test_churn_rate_propagates_missing_data():
    result = engine.churn_rate(active_end=None, active_start=100)
    assert result.is_applicable is False


class TestDecimalInputsFromDatabase:
    """Regressao: colunas Numeric do SQLAlchemy chegam como decimal.Decimal,
    nao float. `Decimal("1") * 1.0` levanta TypeError em Python puro, o que
    quebrava qualquer metrica com dado real do banco (nunca detectado pelos
    testes acima, que so passam int/float sinteticos) — ver correcao em
    app/modules/metrics/engine.py (_as_float).
    """

    def test_margin_with_decimal_revenue_and_profit(self):
        result = engine.margin(revenue=Decimal("1000.00"), profit=Decimal("600.00"))
        assert result.is_applicable is True
        assert result.value == pytest.approx(0.6)

    def test_margin_with_decimal_revenue_and_float_profit(self):
        # Cenario exato do bug real: profit() ja devolveu float, revenue
        # ainda e Decimal (direto da coluna) — tipos misturados na mesma chamada.
        result = engine.margin(revenue=Decimal("1000.00"), profit=600.0)
        assert result.is_applicable is True
        assert result.value == pytest.approx(0.6)

    def test_cpm_with_decimal_uses_multiplier_without_type_error(self):
        # cpm() usa multiplier=1000 (float) internamente — era o ponto exato
        # onde Decimal * float estourava TypeError.
        result = engine.cpm(investment=Decimal("50.00"), impressions=Decimal("10000"))
        assert result.value == pytest.approx(5.0)

    def test_profit_with_decimal_fields(self):
        result = engine.profit(
            revenue=Decimal("1000.00"),
            costs=Decimal("300.00"),
            expenses=Decimal("50.00"),
            taxes=Decimal("10.00"),
        )
        assert result.value == pytest.approx(640.0)

    def test_roi_with_decimal_fields(self):
        result = engine.roi(attributed_revenue=Decimal("4000.00"), investment=Decimal("1000.00"))
        assert result.value == pytest.approx(3.0)

    def test_ltv_with_decimal_fields(self):
        result = engine.ltv(
            average_ticket=Decimal("100.00"), purchase_frequency=Decimal("2"), retention_time=Decimal("3")
        )
        assert result.value == pytest.approx(600.0)

    def test_compare_periods_with_decimal_fields(self):
        cmp = engine.compare_periods(baseline_value=Decimal("50000.00"), current_value=Decimal("68000.00"))
        assert cmp.absolute_change == pytest.approx(18000.0)
        assert cmp.percent_change == pytest.approx(0.36)


class TestComparePeriods:
    def test_normal_variation(self):
        cmp = engine.compare_periods(baseline_value=50000, current_value=68000)
        assert cmp.absolute_change == 18000
        assert cmp.percent_change == pytest.approx(0.36)

    def test_baseline_missing_yields_no_variation_but_preserves_current(self):
        cmp = engine.compare_periods(baseline_value=None, current_value=68000)
        assert cmp.current_value == 68000
        assert cmp.baseline_value is None
        assert cmp.absolute_change is None
        assert cmp.percent_change is None

    def test_baseline_zero_has_absolute_but_no_percent_change(self):
        # RN-003: variacao percentual sobre baseline 0 nao e aplicavel,
        # mas a variacao absoluta ainda e um numero valido e util.
        cmp = engine.compare_periods(baseline_value=0, current_value=500)
        assert cmp.absolute_change == 500
        assert cmp.percent_change is None


class TestTargetProgress:
    def test_current_below_target(self):
        result = engine.target_progress(current=41500, target=50000)
        assert result.is_applicable is True
        assert result.value == pytest.approx(0.83)

    def test_current_above_target(self):
        result = engine.target_progress(current=60000, target=50000)
        assert result.value == pytest.approx(1.2)

    def test_target_missing_is_not_applicable(self):
        result = engine.target_progress(current=41500, target=None)
        assert result.is_applicable is False
        assert "target" in (result.reason or "")

    def test_target_zero_is_division_by_zero_not_applicable(self):
        result = engine.target_progress(current=41500, target=0)
        assert result.is_applicable is False

    def test_current_missing_is_not_applicable(self):
        result = engine.target_progress(current=None, target=50000)
        assert result.is_applicable is False


class TestCorrelation:
    def test_perfect_positive_correlation(self):
        result = engine.correlation([1, 2, 3, 4], [10, 20, 30, 40])
        assert result.is_applicable is True
        assert result.value == pytest.approx(1.0)

    def test_perfect_negative_correlation(self):
        result = engine.correlation([1, 2, 3, 4], [40, 30, 20, 10])
        assert result.value == pytest.approx(-1.0)

    def test_no_correlation_between_unrelated_series(self):
        # x sobe, y oscila sem padrao — correlacao proxima de zero.
        result = engine.correlation([1, 2, 3, 4, 5], [3, 1, 4, 1, 5])
        assert result.is_applicable is True
        assert -0.5 < result.value < 0.5

    def test_fewer_than_3_points_is_not_applicable(self):
        result = engine.correlation([1, 2], [10, 20])
        assert result.is_applicable is False
        assert "3" in (result.reason or "")

    def test_zero_points_is_not_applicable(self):
        result = engine.correlation([], [])
        assert result.is_applicable is False

    def test_constant_series_is_undefined_not_applicable(self):
        # y nunca muda — correlacao matematicamente indefinida, nunca 0.
        result = engine.correlation([1, 2, 3], [5, 5, 5])
        assert result.is_applicable is False
        assert result.value is None

    def test_mismatched_lengths_raises(self):
        with pytest.raises(ValueError):
            engine.correlation([1, 2, 3], [1, 2])
