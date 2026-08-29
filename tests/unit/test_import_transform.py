"""app/modules/imports/transform.py e puro (nao toca banco/arquivo) —
normalizacao de numero/data vinda de arquivo importado."""

from datetime import date

import pytest

from app.modules.imports.transform import TransformError, parse_date, parse_decimal


class TestParseDecimal:
    def test_none_is_none(self):
        assert parse_decimal(None) is None

    def test_empty_string_is_none(self):
        assert parse_decimal("") is None
        assert parse_decimal("   ") is None

    def test_native_int_and_float_pass_through(self):
        assert parse_decimal(10) == 10.0
        assert parse_decimal(10.5) == 10.5

    def test_plain_dot_decimal(self):
        assert parse_decimal("1250.50") == 1250.50

    def test_brl_currency_symbol_and_thousands_dot_comma_decimal(self):
        assert parse_decimal("R$ 1.250,50") == 1250.50

    def test_comma_as_thousands_dot_as_decimal(self):
        # "1,250.50" -> separador decimal e o ultimo (".") -> milhar e ","
        assert parse_decimal("1,250.50") == 1250.50

    def test_single_comma_short_fraction_is_decimal_separator(self):
        assert parse_decimal("1,5") == 1.5

    def test_single_comma_long_fraction_is_thousands_separator(self):
        assert parse_decimal("1,500") == 1500.0

    def test_negative_value(self):
        assert parse_decimal("-100.50") == -100.50

    def test_unparseable_string_raises(self):
        with pytest.raises(TransformError):
            parse_decimal("abc")

    def test_unexpected_type_raises(self):
        with pytest.raises(TransformError):
            parse_decimal(["not", "a", "number"])


class TestParseDate:
    def test_none_is_none(self):
        assert parse_date(None) is None

    def test_empty_string_is_none(self):
        assert parse_date("") is None

    def test_iso_format_always_accepted_regardless_of_date_format(self):
        assert parse_date("2026-08-29", date_format="MDY") == date(2026, 8, 29)

    def test_dmy_default(self):
        assert parse_date("29/08/2026") == date(2026, 8, 29)

    def test_mdy_when_requested(self):
        assert parse_date("08/29/2026", date_format="MDY") == date(2026, 8, 29)

    def test_dmy_vs_mdy_disambiguation_changes_result(self):
        # "05/03/2026" e ambiguo — o resultado depende so do date_format,
        # nunca de um palpite silencioso.
        assert parse_date("05/03/2026", date_format="DMY") == date(2026, 3, 5)
        assert parse_date("05/03/2026", date_format="MDY") == date(2026, 5, 3)

    def test_year_first_with_slash_is_always_iso_order(self):
        assert parse_date("2026/08/29", date_format="MDY") == date(2026, 8, 29)

    def test_native_date_and_datetime_pass_through(self):
        from datetime import datetime

        assert parse_date(date(2026, 8, 29)) == date(2026, 8, 29)
        assert parse_date(datetime(2026, 8, 29, 10, 30)) == date(2026, 8, 29)

    def test_invalid_calendar_date_raises(self):
        with pytest.raises(TransformError):
            parse_date("31/13/2026")

    def test_unrecognized_format_raises(self):
        with pytest.raises(TransformError):
            parse_date("29 de agosto de 2026")

    def test_unexpected_type_raises(self):
        with pytest.raises(TransformError):
            parse_date(12345)
