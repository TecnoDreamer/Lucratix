"""app/core/formatting.py e puro — formatacao pt-BR de numero pra texto
gerado no backend (relatorio em PDF)."""

from app.core.formatting import format_decimal, format_integer, format_percentage


def test_format_integer_uses_dot_as_thousands_separator():
    assert format_integer(1234567) == "1.234.567"
    assert format_integer(800) == "800"
    assert format_integer(0) == "0"


def test_format_integer_rounds_to_nearest():
    assert format_integer(10000.4) == "10.000"
    assert format_integer(10000.6) == "10.001"


def test_format_percentage_uses_comma_as_decimal_separator():
    assert format_percentage(0.267) == "26,7%"
    assert format_percentage(0.5) == "50,0%"
    assert format_percentage(1.0) == "100,0%"


def test_format_percentage_signed_prepends_plus_only_when_positive():
    assert format_percentage(0.2, signed=True) == "+20,0%"
    assert format_percentage(-0.1, signed=True) == "-10,0%"
    assert format_percentage(0.0, signed=True) == "0,0%"


def test_format_percentage_never_signed_by_default():
    assert format_percentage(0.2) == "20,0%"


def test_format_decimal_uses_dot_as_thousands_and_comma_as_decimal():
    assert format_decimal(1234567.89) == "1.234.567,89"
    assert format_decimal(800) == "800"


def test_format_decimal_suppresses_trailing_zero_fraction_digits():
    # Mesmo comportamento de toLocaleString sem minimumFractionDigits no
    # frontend (lib/formatters.ts): "40,00" nunca aparece, so "40".
    assert format_decimal(40.0) == "40"
    assert format_decimal(40.5) == "40,5"
    assert format_decimal(200.00) == "200"


def test_format_decimal_rounds_to_max_fraction_digits():
    assert format_decimal(1234.567, max_fraction_digits=2) == "1.234,57"
