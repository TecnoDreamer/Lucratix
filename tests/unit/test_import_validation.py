"""app/modules/imports/validation.py e puro (recebe raw_rows + mapping,
nunca toca banco) — campo obrigatorio, transformacao com erro e duplicidade
por chave natural (dentro do arquivo e contra o banco)."""

from datetime import date

from app.modules.imports.domains import FINANCIAL_PERIODS
from app.modules.imports.validation import validate_rows

MAPPING = {"Periodo": "period", "Receita": "revenue"}


def test_valid_row_has_no_errors_and_transforms_values():
    rows = [{"Periodo": "2026-01-01", "Receita": "1000"}]
    summary = validate_rows(rows, MAPPING, FINANCIAL_PERIODS, {}, set())

    assert summary.total == 1
    assert summary.valid == 1
    assert summary.invalid == 0
    result = summary.rows[0]
    assert result.status == "valid"
    assert result.transformed["period"] == date(2026, 1, 1)
    assert result.transformed["revenue"] == 1000.0


def test_missing_required_field_is_invalid():
    rows = [{"Periodo": "", "Receita": "1000"}]
    summary = validate_rows(rows, MAPPING, FINANCIAL_PERIODS, {}, set())

    assert summary.invalid == 1
    result = summary.rows[0]
    assert result.status == "invalid"
    assert any(e.field == "period" for e in result.errors)


def test_unparseable_value_is_invalid_with_field_and_raw_value():
    rows = [{"Periodo": "2026-01-01", "Receita": "not-a-number"}]
    summary = validate_rows(rows, MAPPING, FINANCIAL_PERIODS, {}, set())

    result = summary.rows[0]
    assert result.status == "invalid"
    error = next(e for e in result.errors if e.field == "revenue")
    assert error.raw_value == "not-a-number"


def test_unmapped_header_is_ignored():
    mapping = {"Periodo": "period", "Coluna Sem Mapeamento": ""}
    rows = [{"Periodo": "2026-01-01", "Coluna Sem Mapeamento": "qualquer coisa"}]
    summary = validate_rows(rows, mapping, FINANCIAL_PERIODS, {}, set())
    assert summary.valid == 1


def test_duplicate_within_same_file_marks_second_occurrence():
    rows = [
        {"Periodo": "2026-01-01", "Receita": "1000"},
        {"Periodo": "2026-01-01", "Receita": "2000"},
    ]
    summary = validate_rows(rows, MAPPING, FINANCIAL_PERIODS, {}, set())

    assert summary.rows[0].status == "valid"
    assert summary.rows[1].status == "duplicate"
    assert summary.duplicate == 1


def test_duplicate_against_existing_database_rows():
    rows = [{"Periodo": "2026-01-01", "Receita": "1000"}]
    existing = {(date(2026, 1, 1),)}
    summary = validate_rows(rows, MAPPING, FINANCIAL_PERIODS, {}, existing)

    assert summary.rows[0].status == "duplicate"
    assert summary.duplicate == 1


def test_date_format_from_transform_config_is_respected():
    rows = [{"Periodo": "05/03/2026", "Receita": "1000"}]
    summary_dmy = validate_rows(rows, MAPPING, FINANCIAL_PERIODS, {"date_format": "DMY"}, set())
    summary_mdy = validate_rows(rows, MAPPING, FINANCIAL_PERIODS, {"date_format": "MDY"}, set())

    assert summary_dmy.rows[0].transformed["period"] == date(2026, 3, 5)
    assert summary_mdy.rows[0].transformed["period"] == date(2026, 5, 3)


def test_invalid_row_is_never_also_marked_duplicate():
    # Uma linha invalida nao entra no calculo de duplicidade (nao teria
    # como formar a chave natural de forma confiavel).
    rows = [
        {"Periodo": "", "Receita": "1000"},
        {"Periodo": "", "Receita": "2000"},
    ]
    summary = validate_rows(rows, MAPPING, FINANCIAL_PERIODS, {}, set())
    assert summary.invalid == 2
    assert summary.duplicate == 0
