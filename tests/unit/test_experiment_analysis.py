"""RN-013 — experimento nao declara vencedor sem amostra minima, e (2026-08-31)
teste de significancia estatistica formal (teste-z de duas proporcoes) uma
vez que a amostra minima e atingida."""

import pytest

from app.modules.experiments.analysis import (
    MIN_SAMPLE_SIZE,
    SIGNIFICANCE_ALPHA,
    VariantInput,
    summarize_experiment,
    two_proportion_z_test,
)


def test_no_leading_variant_when_sample_below_minimum():
    variants = [
        VariantInput("A", sample_size=10, conversions=5),
        VariantInput("B", sample_size=10, conversions=2),
    ]
    summary = summarize_experiment(variants)

    assert summary.has_sufficient_sample is False
    assert summary.leading_variant_name is None
    assert "RN-013" in summary.note


def test_no_leading_variant_when_sample_size_missing():
    variants = [
        VariantInput("A", sample_size=None, conversions=None),
        VariantInput("B", sample_size=100, conversions=50),
    ]
    summary = summarize_experiment(variants)

    assert summary.has_sufficient_sample is False
    assert summary.leading_variant_name is None


def test_leading_variant_only_indicated_above_minimum_sample():
    variants = [
        VariantInput("A", sample_size=MIN_SAMPLE_SIZE, conversions=20),
        VariantInput("B", sample_size=MIN_SAMPLE_SIZE, conversions=10),
    ]
    summary = summarize_experiment(variants)

    assert summary.has_sufficient_sample is True
    assert summary.leading_variant_name == "A"
    assert "teste-z" in summary.note.lower()
    assert summary.significance_alpha == SIGNIFICANCE_ALPHA


def test_baseline_variant_never_carries_its_own_p_value():
    variants = [
        VariantInput("A", sample_size=MIN_SAMPLE_SIZE, conversions=20),
        VariantInput("B", sample_size=MIN_SAMPLE_SIZE, conversions=10),
    ]
    summary = summarize_experiment(variants)

    baseline, challenger = summary.variants
    assert baseline.p_value is None
    assert baseline.is_significant is None
    assert challenger.p_value == pytest.approx(0.009823, abs=1e-6)
    assert challenger.is_significant is True


def test_challenger_close_to_baseline_is_not_significant():
    variants = [
        VariantInput("A", sample_size=MIN_SAMPLE_SIZE, conversions=16),
        VariantInput("B", sample_size=MIN_SAMPLE_SIZE, conversions=14),
    ]
    summary = summarize_experiment(variants)

    challenger = summary.variants[1]
    assert challenger.p_value == pytest.approx(0.605577, abs=1e-6)
    assert challenger.is_significant is False


def test_no_p_value_below_minimum_sample_even_if_rates_differ_a_lot():
    variants = [
        VariantInput("A", sample_size=10, conversions=9),
        VariantInput("B", sample_size=10, conversions=1),
    ]
    summary = summarize_experiment(variants)

    assert all(v.p_value is None and v.is_significant is None for v in summary.variants)


class TestTwoProportionZTest:
    def test_known_significant_case(self):
        z, p_value = two_proportion_z_test(20, 30, 10, 30)
        assert z == pytest.approx(2.581989, abs=1e-5)
        assert p_value == pytest.approx(0.009823, abs=1e-6)

    def test_known_non_significant_case(self):
        _, p_value = two_proportion_z_test(16, 30, 14, 30)
        assert p_value == pytest.approx(0.605577, abs=1e-6)

    def test_identical_zero_rates_have_no_defined_z(self):
        """0/30 contra 0/30: taxas identicas, variancia combinada zero — z
        matematicamente indefinido, NUNCA um p_value=1.0 fabricado."""
        assert two_proportion_z_test(0, 30, 0, 30) == (None, None)

    def test_identical_full_rates_have_no_defined_z(self):
        assert two_proportion_z_test(30, 30, 30, 30) == (None, None)

    def test_missing_sample_size_returns_none(self):
        assert two_proportion_z_test(5, None, 5, 30) == (None, None)

    def test_zero_sample_size_returns_none(self):
        assert two_proportion_z_test(0, 0, 5, 30) == (None, None)


def test_never_raises_on_zero_sample_size():
    variants = [
        VariantInput("A", sample_size=0, conversions=0),
        VariantInput("B", sample_size=MIN_SAMPLE_SIZE, conversions=10),
    ]
    summary = summarize_experiment(variants)

    assert summary.variants[0].conversion_rate.is_applicable is False
    assert summary.has_sufficient_sample is False
    assert summary.leading_variant_name is None


def test_single_variant_never_has_a_leader():
    summary = summarize_experiment([VariantInput("Unica", sample_size=1000, conversions=500)])
    assert summary.has_sufficient_sample is False
    assert summary.leading_variant_name is None
