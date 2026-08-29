"""Serialização genérica CSV/XLSX/JSON — a mesma ideia de `parsers.py` do
lado da importação, só que na direção contrária. Não conhece nenhum domínio
específico: recebe `DomainSpec` (para os cabeçalhos amigáveis) + linhas já no
formato canônico (`readers.py`) e devolve bytes prontos para download.
"""

import csv
import io
import json
from datetime import date

import openpyxl

from app.modules.imports.domains import DomainSpec
from app.modules.imports.security import sanitize_for_spreadsheet

CONTENT_TYPES = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "json": "application/json",
}


def _sanitize_text(value: object) -> object:
    """Texto passa pela sanitização contra CSV/Spreadsheet Formula Injection
    (nenhum campo de financial_periods é texto livre hoje, mas o serializer
    é genérico — um domínio futuro como Produtos/Marketing terá campo de
    texto)."""
    if isinstance(value, str):
        return sanitize_for_spreadsheet(value)
    return value


def _csv_cell(value: object) -> object:
    if isinstance(value, date):
        return value.isoformat()
    if value is None:
        return ""
    return _sanitize_text(value)


def _xlsx_cell(value: object) -> object:
    # Ao contrário do CSV (só texto), o .xlsx guarda o tipo nativo — data
    # continua um valor de data de verdade (célula formatada, ordenável/
    # filtrável no Excel), e None fica genuinamente em branco em vez de "".
    return _sanitize_text(value)


def to_csv_bytes(domain: DomainSpec, rows: list[dict[str, object]]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([field.display_name for field in domain.fields])
    for row in rows:
        writer.writerow([_csv_cell(row.get(field.canonical_name)) for field in domain.fields])
    # BOM (utf-8-sig): Excel no Windows só reconhece UTF-8 sem BOM como
    # ANSI/latin-1 e corrompe acento — mesma convenção que `_decode_text`
    # (parsers.py) já tenta primeiro na leitura.
    return buf.getvalue().encode("utf-8-sig")


def to_xlsx_bytes(domain: DomainSpec, rows: list[dict[str, object]]) -> bytes:
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = domain.display_name[:31]  # limite de nome de aba do Excel
    sheet.append([field.display_name for field in domain.fields])
    for row in rows:
        sheet.append([_xlsx_cell(row.get(field.canonical_name)) for field in domain.fields])
    buf = io.BytesIO()
    workbook.save(buf)
    return buf.getvalue()


def to_json_bytes(domain: DomainSpec, rows: list[dict[str, object]]) -> bytes:
    """Chave canônica (não o nome de exibição) — um arquivo exportado assim
    é reimportável diretamente, sem precisar passar pela etapa de
    mapeamento de novo (a sugestão de mapeamento também reconheceria os
    nomes de exibição via alias, mas a chave canônica elimina até essa
    etapa)."""
    payload: list[dict[str, object]] = []
    for row in rows:
        item: dict[str, object] = {}
        for field in domain.fields:
            value = row.get(field.canonical_name)
            item[field.canonical_name] = value.isoformat() if isinstance(value, date) else value
        payload.append(item)
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


_SERIALIZERS = {
    "csv": to_csv_bytes,
    "xlsx": to_xlsx_bytes,
    "json": to_json_bytes,
}


def serialize(file_format: str, domain: DomainSpec, rows: list[dict[str, object]]) -> bytes:
    serializer = _SERIALIZERS[file_format]
    return serializer(domain, rows)


def build_filename(domain_key: str, file_format: str, date_from: date | None, date_to: date | None) -> str:
    if date_from is not None and date_to is not None:
        return f"{domain_key}_{date_from.isoformat()}_{date_to.isoformat()}.{file_format}"
    return f"{domain_key}_export.{file_format}"
