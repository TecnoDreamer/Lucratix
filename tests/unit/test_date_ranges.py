"""app/modules/analytics/date_ranges.py e puro — RF-023."""

from datetime import date

from app.modules.analytics.date_ranges import (
    month_end,
    months_between,
    months_in_range,
    previous_equivalent_range,
)


def test_previous_equivalent_range_full_month():
    previous_from, previous_to = previous_equivalent_range(date(2026, 8, 1), date(2026, 8, 31))
    assert previous_from == date(2026, 7, 1)
    assert previous_to == date(2026, 7, 31)


def test_previous_equivalent_range_preserves_length_across_month_boundary():
    # 15 dias (17/08 a 31/08) -> os 15 dias imediatamente anteriores.
    previous_from, previous_to = previous_equivalent_range(date(2026, 8, 17), date(2026, 8, 31))
    assert (previous_to - previous_from).days + 1 == 15
    assert previous_to == date(2026, 8, 16)
    assert previous_from == date(2026, 8, 2)


def test_previous_equivalent_range_across_year_boundary():
    previous_from, previous_to = previous_equivalent_range(date(2026, 1, 1), date(2026, 1, 31))
    assert previous_from == date(2025, 12, 1)
    assert previous_to == date(2025, 12, 31)


def test_previous_equivalent_range_single_day():
    previous_from, previous_to = previous_equivalent_range(date(2026, 8, 15), date(2026, 8, 15))
    assert previous_from == previous_to == date(2026, 8, 14)


def test_months_in_range_same_month():
    assert months_in_range(date(2026, 8, 1), date(2026, 8, 31)) == 1


def test_months_in_range_spans_two_months():
    assert months_in_range(date(2026, 8, 15), date(2026, 9, 3)) == 2


def test_months_in_range_spans_year_boundary():
    assert months_in_range(date(2025, 11, 1), date(2026, 2, 28)) == 4


def test_months_between_same_month_returns_single_point():
    assert months_between(date(2026, 8, 1), date(2026, 8, 31)) == [date(2026, 8, 1)]


def test_months_between_spans_two_months_regardless_of_day():
    # 15/08 a 03/09 toca agosto e setembro inteiros — o dia dentro do mes
    # nao importa, so o mes de calendario.
    assert months_between(date(2026, 8, 15), date(2026, 9, 3)) == [date(2026, 8, 1), date(2026, 9, 1)]


def test_months_between_spans_year_boundary():
    assert months_between(date(2025, 11, 1), date(2026, 2, 28)) == [
        date(2025, 11, 1),
        date(2025, 12, 1),
        date(2026, 1, 1),
        date(2026, 2, 1),
    ]


def test_months_between_length_matches_months_in_range():
    date_from, date_to = date(2025, 6, 10), date(2026, 3, 2)
    assert len(months_between(date_from, date_to)) == months_in_range(date_from, date_to)


def test_month_end_regular_month():
    assert month_end(date(2026, 9, 1)) == date(2026, 9, 30)


def test_month_end_december_crosses_year_boundary():
    assert month_end(date(2026, 12, 1)) == date(2026, 12, 31)


def test_month_end_february_leap_year():
    assert month_end(date(2028, 2, 1)) == date(2028, 2, 29)


def test_month_end_february_non_leap_year():
    assert month_end(date(2026, 2, 1)) == date(2026, 2, 28)
