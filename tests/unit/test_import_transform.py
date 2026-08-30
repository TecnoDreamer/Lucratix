"""app/modules/imports/transform.py e puro (nao toca banco/arquivo) —
normalizacao de numero/data vinda de arquivo importado."""

from datetime import date

import pytest

from app.modules.imports.transform import (
    TransformError,
    parse_boolean,
    parse_date,
    parse_decimal,
    parse_integer,
    parse_string,
)


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


class TestParseInteger:
    def test_none_is_none(self):
        assert parse_integer(None) is None

    def test_empty_string_is_none(self):
        assert parse_integer("") is None

    def test_native_int_passes_through(self):
        assert parse_integer(1500) == 1500

    def test_plain_string_integer(self):
        assert parse_integer("1500") == 1500

    def test_thousands_separator(self):
        # Mesma resolução de ambiguidade de parse_decimal — só vírgula com 3+
        # dígitos depois dela é separador de milhar, não decimal.
        assert parse_integer("1,500") == 1500

    def test_fractional_value_raises(self):
        # Uma contagem (leads, impressões...) não pode ser fracionária.
        with pytest.raises(TransformError):
            parse_integer("10.5")

    def test_native_float_with_fraction_raises(self):
        with pytest.raises(TransformError):
            parse_integer(10.5)

    def test_native_float_without_fraction_is_int(self):
        assert parse_integer(10.0) == 10

    def test_unparseable_string_raises(self):
        with pytest.raises(TransformError):
            parse_integer("abc")


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


class TestParseString:
    def test_none_is_none(self):
        assert parse_string(None) is None

    def test_blank_after_strip_is_none(self):
        assert parse_string("   ") is None

    def test_strips_whitespace(self):
        assert parse_string("  Notebook Pro  ") == "Notebook Pro"

    def test_non_string_is_converted(self):
        assert parse_string(42) == "42"

    def test_within_max_length_passes(self):
        assert parse_string("abc", max_length=3) == "abc"

    def test_over_max_length_raises(self):
        with pytest.raises(TransformError):
            parse_string("abcd", max_length=3)


class TestParseBoolean:
    def test_none_is_none(self):
        assert parse_boolean(None) is None

    def test_empty_string_is_none(self):
        assert parse_boolean("") is None

    def test_native_bool_passes_through(self):
        assert parse_boolean(True) is True
        assert parse_boolean(False) is False

    def test_native_zero_and_one(self):
        assert parse_boolean(1) is True
        assert parse_boolean(0) is False

    @pytest.mark.parametrize("value", ["true", "1", "sim", "yes", "y", "ativo", "verdadeiro", "ATIVO"])
    def test_recognizes_true_values(self, value):
        assert parse_boolean(value) is True

    @pytest.mark.parametrize("value", ["false", "0", "nao", "não", "no", "n", "inativo", "falso"])
    def test_recognizes_false_values(self, value):
        assert parse_boolean(value) is False

    def test_unrecognized_string_raises(self):
        with pytest.raises(TransformError):
            parse_boolean("talvez")

    def test_native_number_out_of_range_raises(self):
        with pytest.raises(TransformError):
            parse_boolean(2)

    def test_unexpected_type_raises(self):
        with pytest.raises(TransformError):
            parse_boolean(["a"])
