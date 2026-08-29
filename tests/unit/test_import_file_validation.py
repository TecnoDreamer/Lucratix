"""app/modules/imports/security.py — validacao de arquivo em profundidade
(secao 17-18 do prompt mestre): extensao, assinatura real de conteudo,
tamanho, profundidade de JSON, e sanitizacao contra formula injection."""

import pytest

from app.modules.imports.security import (
    MAX_FILE_SIZE_BYTES,
    FileValidationError,
    _json_depth,
    detect_format_from_filename,
    sanitize_for_spreadsheet,
    validate_file,
)


class TestDetectFormatFromFilename:
    def test_recognizes_known_extensions(self):
        assert detect_format_from_filename("dados.csv") == "csv"
        assert detect_format_from_filename("dados.xlsx") == "xlsx"
        assert detect_format_from_filename("dados.json") == "json"

    def test_case_insensitive(self):
        assert detect_format_from_filename("DADOS.CSV") == "csv"

    def test_unknown_extension_raises(self):
        with pytest.raises(FileValidationError):
            detect_format_from_filename("dados.pdf")


class TestValidateFile:
    def test_valid_csv_passes(self):
        validate_file(filename="dados.csv", content=b"a,b\n1,2\n", declared_format="csv")

    def test_declared_format_not_allowed_raises(self):
        with pytest.raises(FileValidationError):
            validate_file(filename="dados.csv", content=b"x", declared_format="pdf")

    def test_extension_mismatch_with_declared_format_raises(self):
        # Nome diz .csv mas o form declara xlsx — nunca confia so no que o
        # cliente envia no campo "domain"/multipart separado do nome real.
        with pytest.raises(FileValidationError):
            validate_file(filename="dados.csv", content=b"PK\x03\x04resto", declared_format="xlsx")

    def test_empty_file_raises(self):
        with pytest.raises(FileValidationError):
            validate_file(filename="dados.csv", content=b"", declared_format="csv")

    def test_oversized_file_raises(self):
        content = b"a" * (MAX_FILE_SIZE_BYTES + 1)
        with pytest.raises(FileValidationError):
            validate_file(filename="dados.csv", content=content, declared_format="csv")

    def test_xlsx_without_real_zip_signature_raises(self):
        # Extensao .xlsx mas conteudo nao e um ZIP de verdade (renomeado).
        with pytest.raises(FileValidationError):
            validate_file(filename="fake.xlsx", content=b"isto nao e um zip", declared_format="xlsx")

    def test_xlsx_with_real_signature_passes(self):
        validate_file(filename="real.xlsx", content=b"PK\x03\x04" + b"0" * 20, declared_format="xlsx")

    def test_malformed_json_raises(self):
        with pytest.raises(FileValidationError):
            validate_file(filename="dados.json", content=b"{not valid", declared_format="json")

    def test_deeply_nested_json_raises(self):
        nested = b'{"a": {"b": {"c": {"d": {"e": 1}}}}}'
        with pytest.raises(FileValidationError):
            validate_file(filename="dados.json", content=nested, declared_format="json")

    def test_shallow_json_passes(self):
        validate_file(
            filename="dados.json", content=b'[{"periodo": "2026-01-01"}]', declared_format="json"
        )


class TestJsonDepth:
    def test_flat_object_is_depth_1(self):
        assert _json_depth({"a": 1}) == 1

    def test_scalar_is_depth_0(self):
        assert _json_depth(1) == 0
        assert _json_depth("x") == 0

    def test_nested_object_counts_each_level(self):
        assert _json_depth({"a": {"b": {"c": 1}}}) == 3

    def test_empty_containers_do_not_count(self):
        assert _json_depth({}) == 0
        assert _json_depth([]) == 0


class TestSanitizeForSpreadsheet:
    @pytest.mark.parametrize("prefix", ["=", "+", "-", "@", "\t", "\r"])
    def test_formula_prefixes_are_neutralized(self, prefix):
        result = sanitize_for_spreadsheet(f"{prefix}cmd|'/C calc'!A1")
        assert result.startswith("'")

    def test_normal_text_is_untouched(self):
        assert sanitize_for_spreadsheet("Campanha de Verão") == "Campanha de Verão"

    def test_empty_string_is_untouched(self):
        assert sanitize_for_spreadsheet("") == ""
