"""RN-013 — experimento nao declara vencedor sem amostra minima."""

from app.modules.experiments.analysis import MIN_SAMPLE_SIZE, VariantInput, summarize_experiment


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
    assert "nao e um teste de significancia estatistica" in summary.note.lower()


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
