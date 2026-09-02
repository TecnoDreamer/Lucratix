"""app/modules/analytics/funnel_analytics.py e puro (nao toca banco): os
modelos SQLAlchemy usados aqui sao construidos em memoria, sem sessao/commit.
"""

from app.models.funnel_snapshot import FunnelSnapshot
from app.modules.analytics.funnel_analytics import (
    FUNNEL_STAGES,
    STAGE_TRANSITIONS,
    compute_stage_conversions,
    stage_values,
)


def test_stage_transitions_cover_all_seven_consecutive_pairs():
    assert STAGE_TRANSITIONS == (
        ("impressions", "visits"),
        ("visits", "leads"),
        ("leads", "mqls"),
        ("mqls", "sqls"),
        ("sqls", "opportunities"),
        ("opportunities", "customers"),
        ("customers", "repeat_purchases"),
    )
    assert len(FUNNEL_STAGES) == 8


def test_compute_stage_conversions_with_complete_data():
    funnel = FunnelSnapshot(
        impressions=10000, visits=2000, leads=500, mqls=300, sqls=150,
        opportunities=100, customers=40, repeat_purchases=10,
    )
    conversions = compute_stage_conversions(funnel)

    leads_to_mqls = next(c for c in conversions if (c.from_stage, c.to_stage) == ("leads", "mqls"))
    assert leads_to_mqls.conversion_rate.is_applicable is True
    assert leads_to_mqls.conversion_rate.value == 0.6  # 300 / 500
    assert leads_to_mqls.drop_off_rate.is_applicable is True
    assert round(leads_to_mqls.drop_off_rate.value, 10) == 0.4  # 1 - 0.6


def test_compute_stage_conversions_missing_stage_is_not_applicable_never_zero():
    # visits ausente (None) -> conversao visits->leads nao aplicavel
    # (RN-003), e o abandono herda a MESMA razao, nunca "1 - None".
    funnel = FunnelSnapshot(impressions=10000, visits=None, leads=500)
    conversions = compute_stage_conversions(funnel)

    visits_to_leads = next(c for c in conversions if (c.from_stage, c.to_stage) == ("visits", "leads"))
    assert visits_to_leads.conversion_rate.is_applicable is False
    assert visits_to_leads.conversion_rate.value is None
    assert visits_to_leads.drop_off_rate.is_applicable is False
    assert visits_to_leads.drop_off_rate.value is None
    assert visits_to_leads.drop_off_rate.reason == visits_to_leads.conversion_rate.reason


def test_compute_stage_conversions_base_zero_is_division_by_zero_not_exception():
    funnel = FunnelSnapshot(impressions=0, visits=0)
    conversions = compute_stage_conversions(funnel)

    impressions_to_visits = next(
        c for c in conversions if (c.from_stage, c.to_stage) == ("impressions", "visits")
    )
    assert impressions_to_visits.conversion_rate.is_applicable is False
    assert "divisao por zero" in (impressions_to_visits.conversion_rate.reason or "")
    assert impressions_to_visits.drop_off_rate.is_applicable is False


def test_stage_values_missing_funnel_is_not_applicable_for_every_stage_never_zero():
    values = stage_values(None)
    assert len(values) == len(FUNNEL_STAGES)
    for stage in FUNNEL_STAGES:
        assert values[stage].is_applicable is False
        assert values[stage].value is None


def test_stage_values_reads_each_present_stage():
    funnel = FunnelSnapshot(impressions=1000, visits=400, leads=None)
    values = stage_values(funnel)
    assert values["impressions"].value == 1000
    assert values["visits"].value == 400
    assert values["leads"].is_applicable is False
