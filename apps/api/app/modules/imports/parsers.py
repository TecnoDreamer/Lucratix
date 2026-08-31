"""Adapters de parsing por formato (prompt mestre, secao 4). Cada um recebe
os bytes crus do arquivo e devolve um `ParsedFile` — cabecalhos na ordem
original + linhas como dict. Nenhum parser persiste nada em disco: tudo
acontece em memoria, dentro do request de upload (ver domains.py e
app/models/import_job.py sobre a decisao de nao ter storage de arquivo).
"""

import csv
import io
import json
from dataclasses import dataclass

import openpyxl

from app.modules.imports.security import MAX_ROWS, FileValidationError


@dataclass(frozen=True)
class ParsedFile:
    headers: list[str]
    # Cada linha: {header: valor} — valor pode ser str (csv/json) ou um tipo
    # nativo do Python vindo do openpyxl (int/float/date/datetime), que o
    # motor de transformacao (transform.py) sabe tratar sem exigir re-parse
    # de string quando a celula ja veio tipada.
    rows: list[dict[str, object]]
    # Nome da aba efetivamente lida — só .xlsx preenche (auto-selecionada
    # quando o arquivo só tem uma aba, ou a escolhida explicitamente pelo
    # usuário). None para CSV/JSON, que não têm o conceito de aba.
    sheet_name: str | None = None


class SheetSelectionRequiredError(FileValidationError):
    """Levantado quando um .xlsx tem mais de uma aba e nenhuma foi escolhida
    — o chamador (service.py/router.py) decide o que fazer (pedir pro
    usuário escolher), nunca adivinha qual aba importar."""

    def __init__(self, sheet_names: list[str]):
        self.sheet_names = sheet_names
        super().__init__(
            "Este arquivo tem mais de uma aba — escolha qual aba corresponde a este domínio."
        )


def _decode_text(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise FileValidationError("Não foi possível decodificar o arquivo (encoding não reconhecido).")


def parse_csv(content: bytes) -> ParsedFile:
    text = _decode_text(content)
    # csv.Sniffer cobre o caso comum de export BR (";" como separador em vez
    # de ","), sem exigir que o usuario escolha o delimitador manualmente.
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel  # fallback: vírgula, o padrão do módulo csv

    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    if reader.fieldnames is None:
        raise FileValidationError("O CSV não tem cabeçalho.")
    headers = [h.strip() for h in reader.fieldnames if h and h.strip()]
    if not headers:
        raise FileValidationError("O CSV não tem cabeçalho.")

    rows: list[dict[str, object]] = []
    for raw_row in reader:
        if len(rows) >= MAX_ROWS:
            raise FileValidationError(
                f"O arquivo tem mais de {MAX_ROWS} linhas — divida em arquivos menores."
            )
        # None acontece quando a linha tem menos colunas que o cabecalho.
        row: dict[str, object] = {}
        for header in headers:
            value = raw_row.get(header)
            row[header] = value.strip() if isinstance(value, str) else value
        rows.append(row)
    return ParsedFile(headers=headers, rows=rows)


def parse_xlsx(content: bytes, sheet_name: str | None = None) -> ParsedFile:
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:  # openpyxl levanta varios tipos de erro para arquivo corrompido
        raise FileValidationError("Não foi possível abrir o arquivo .xlsx (arquivo corrompido?).") from exc

    if not workbook.worksheets:
        raise FileValidationError("A planilha não tem nenhuma aba.")

    if sheet_name is None:
        # So auto-seleciona quando nao ha ambiguidade (uma aba so) — com
        # mais de uma, quem decide qual aba e o dominio certo e quem esta
        # importando, nunca uma adivinhação silenciosa (poderia pegar a aba
        # errada sem ninguem perceber).
        if len(workbook.worksheets) > 1:
            raise SheetSelectionRequiredError([ws.title for ws in workbook.worksheets])
        sheet = workbook.worksheets[0]
    else:
        sheet = workbook[sheet_name] if sheet_name in workbook.sheetnames else None
        if sheet is None:
            raise FileValidationError(
                f'Aba "{sheet_name}" não existe neste arquivo. '
                f"Abas disponíveis: {', '.join(workbook.sheetnames)}."
            )

    rows_iter = sheet.iter_rows(values_only=True)
    try:
        header_row = next(rows_iter)
    except StopIteration as exc:
        raise FileValidationError("A planilha está vazia.") from exc

    headers = [str(h).strip() for h in header_row if h is not None and str(h).strip()]
    if not headers:
        raise FileValidationError("A planilha não tem cabeçalho na primeira linha.")

    rows: list[dict[str, object]] = []
    for raw_row in rows_iter:
        if all(cell is None for cell in raw_row):
            continue  # linha em branco no meio da planilha — ignora, nao conta como dado
        if len(rows) >= MAX_ROWS:
            raise FileValidationError(
                f"O arquivo tem mais de {MAX_ROWS} linhas — divida em arquivos menores."
            )
        values = list(raw_row) + [None] * (len(headers) - len(raw_row))
        rows.append(dict(zip(headers, values, strict=False)))
    return ParsedFile(headers=headers, rows=rows, sheet_name=sheet.title)


def parse_json(content: bytes) -> ParsedFile:
    text = _decode_text(content)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise FileValidationError("JSON inválido.") from exc

    if isinstance(parsed, dict) and "data" in parsed:
        parsed = parsed["data"]
    if not isinstance(parsed, list):
        raise FileValidationError(
            "O JSON precisa ser uma lista de objetos (ou um objeto com a chave \"data\" contendo a lista)."
        )
    if len(parsed) > MAX_ROWS:
        raise FileValidationError(f"O arquivo tem mais de {MAX_ROWS} linhas — divida em arquivos menores.")

    headers: list[str] = []
    rows: list[dict[str, object]] = []
    for item in parsed:
        if not isinstance(item, dict):
            raise FileValidationError("Cada item da lista precisa ser um objeto (chave: valor).")
        for key in item:
            if not isinstance(item[key], (str, int, float, bool)) and item[key] is not None:
                raise FileValidationError(
                    f'O campo "{key}" tem um valor aninhado (objeto/lista) — cada linha precisa ser plana.'
                )
            if key not in headers:
                headers.append(key)
        rows.append(dict(item))
    return ParsedFile(headers=headers, rows=rows)


_PARSERS = {
    "csv": parse_csv,
    "xlsx": parse_xlsx,
    "json": parse_json,
}


def parse_file(file_format: str, content: bytes, *, sheet_name: str | None = None) -> ParsedFile:
    parser = _PARSERS.get(file_format)
    if parser is None:
        raise FileValidationError(f"Formato '{file_format}' não é suportado.")
    if file_format == "xlsx":
        return parse_xlsx(content, sheet_name=sheet_name)
    return parser(content)
