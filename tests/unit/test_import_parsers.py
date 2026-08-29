"""app/modules/imports/parsers.py — adapters CSV/XLSX/JSON. Cada parser
recebe bytes crus e devolve ParsedFile (headers + rows), sem tocar disco."""

import io

import openpyxl
import pytest

from app.modules.imports.parsers import parse_csv, parse_file, parse_json, parse_xlsx
from app.modules.imports.security import MAX_ROWS, FileValidationError


class TestParseCsv:
    def test_comma_delimited(self):
        parsed = parse_csv(b"Periodo,Receita\n2026-01-01,1000\n")
        assert parsed.headers == ["Periodo", "Receita"]
        assert parsed.rows == [{"Periodo": "2026-01-01", "Receita": "1000"}]

    def test_semicolon_delimited_br_export(self):
        parsed = parse_csv(b"Periodo;Receita\n2026-01-01;1000\n")
        assert parsed.headers == ["Periodo", "Receita"]
        assert parsed.rows[0]["Receita"] == "1000"

    def test_strips_whitespace_from_values(self):
        parsed = parse_csv(b"Periodo,Receita\n  2026-01-01  ,  1000  \n")
        assert parsed.rows[0]["Periodo"] == "2026-01-01"
        assert parsed.rows[0]["Receita"] == "1000"

    def test_utf8_bom_is_handled(self):
        content = "﻿Periodo,Receita\n2026-01-01,1000\n".encode()
        parsed = parse_csv(content)
        assert parsed.headers == ["Periodo", "Receita"]

    def test_no_header_raises(self):
        with pytest.raises(FileValidationError):
            parse_csv(b"")

    def test_too_many_rows_raises(self):
        header = "Periodo,Receita\n"
        body = "\n".join(f"2026-01-{(i % 28) + 1:02d},{i}" for i in range(MAX_ROWS + 1))
        with pytest.raises(FileValidationError):
            parse_csv((header + body).encode("utf-8"))


class TestParseXlsx:
    def _build(self, headers, rows) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(headers)
        for row in rows:
            ws.append(row)
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    def test_reads_first_sheet(self):
        content = self._build(["Periodo", "Receita"], [["2026-01-01", 1000]])
        parsed = parse_xlsx(content)
        assert parsed.headers == ["Periodo", "Receita"]
        assert parsed.rows[0]["Receita"] == 1000

    def test_skips_fully_blank_rows(self):
        content = self._build(["Periodo", "Receita"], [["2026-01-01", 1000], [None, None]])
        parsed = parse_xlsx(content)
        assert len(parsed.rows) == 1

    def test_corrupted_file_raises(self):
        with pytest.raises(FileValidationError):
            parse_xlsx(b"nao e um xlsx de verdade")

    def test_empty_workbook_raises(self):
        wb = openpyxl.Workbook()
        buf = io.BytesIO()
        wb.save(buf)
        with pytest.raises(FileValidationError):
            parse_xlsx(buf.getvalue())


class TestParseJson:
    def test_bare_list(self):
        parsed = parse_json(b'[{"periodo": "2026-01-01", "receita": 1000}]')
        assert parsed.headers == ["periodo", "receita"]
        assert parsed.rows[0]["receita"] == 1000

    def test_data_envelope(self):
        parsed = parse_json(b'{"data": [{"periodo": "2026-01-01"}]}')
        assert parsed.rows == [{"periodo": "2026-01-01"}]

    def test_invalid_json_raises(self):
        with pytest.raises(FileValidationError):
            parse_json(b"{not valid json")

    def test_non_list_root_without_data_key_raises(self):
        with pytest.raises(FileValidationError):
            parse_json(b'{"periodo": "2026-01-01"}')

    def test_nested_object_value_raises(self):
        with pytest.raises(FileValidationError):
            parse_json(b'[{"periodo": "2026-01-01", "receita": {"valor": 1000}}]')

    def test_union_of_headers_across_rows_preserves_first_seen_order(self):
        parsed = parse_json(b'[{"a": 1}, {"b": 2, "a": 3}]')
        assert parsed.headers == ["a", "b"]

    def test_too_many_rows_raises(self):
        payload = "[" + ",".join('{"a": 1}' for _ in range(MAX_ROWS + 1)) + "]"
        with pytest.raises(FileValidationError):
            parse_json(payload.encode("utf-8"))


class TestParseFileDispatcher:
    def test_unsupported_format_raises(self):
        with pytest.raises(FileValidationError):
            parse_file("pdf", b"whatever")

    def test_dispatches_to_csv(self):
        parsed = parse_file("csv", b"Periodo\n2026-01-01\n")
        assert parsed.headers == ["Periodo"]
