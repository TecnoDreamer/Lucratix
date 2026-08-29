"""Validacao de arquivo em profundidade (prompt mestre, secao 17-18):
extensao + assinatura real do conteudo (nao so a extensao/Content-Type
declarados pelo cliente, que sao triviais de falsificar), limite de tamanho
e de linhas (processamento e sincrono — sem fila de jobs, ver domains.py),
e sanitizacao contra CSV/Spreadsheet Formula Injection na exportacao.
"""

import json

ALLOWED_FORMATS = {"csv", "xlsx", "json"}
EXTENSION_TO_FORMAT = {".csv": "csv", ".xlsx": "xlsx", ".json": "json"}

# Conservador de proposito — processamento e sincrono, dentro do tempo de
# uma unica requisicao HTTP, sem fila de jobs (nao ha infraestrutura de
# worker hoje). Documentado como teto a revisar se o volume de uso crescer
# (ver docs/data-import-export/ARCHITECTURE.md).
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_ROWS = 2000

# Assinatura real de um .xlsx (que e um arquivo ZIP por dentro) — pega o caso
# mais comum de um arquivo renomeado/mascarado para passar pela allowlist de
# extensao. Nao substitui um scanner de malware de verdade (nao existe
# servico compativel disponivel hoje — lacuna documentada, nao inventada).
_XLSX_MAGIC = b"PK\x03\x04"


class FileValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def detect_format_from_filename(filename: str) -> str:
    lower = filename.lower()
    for ext, fmt in EXTENSION_TO_FORMAT.items():
        if lower.endswith(ext):
            return fmt
    raise FileValidationError(
        f"Extensão não suportada. Formatos aceitos: {', '.join(sorted(EXTENSION_TO_FORMAT))}."
    )


def validate_file(*, filename: str, content: bytes, declared_format: str) -> None:
    """Levanta FileValidationError com mensagem acionável para o usuário
    quando o arquivo nao passa na validacao. Nunca confia so na extensao."""
    if declared_format not in ALLOWED_FORMATS:
        raise FileValidationError(f"Formato '{declared_format}' não é suportado.")

    real_format_from_name = detect_format_from_filename(filename)
    if real_format_from_name != declared_format:
        raise FileValidationError(
            f"A extensão do arquivo ({real_format_from_name}) não bate com o formato "
            f"selecionado ({declared_format})."
        )

    if len(content) == 0:
        raise FileValidationError("O arquivo está vazio.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
        raise FileValidationError(f"Arquivo maior que o limite de {max_mb:.0f} MB.")

    if declared_format == "xlsx" and not content.startswith(_XLSX_MAGIC):
        raise FileValidationError(
            "O conteúdo do arquivo não corresponde a um .xlsx válido (assinatura inesperada)."
        )

    if declared_format == "json":
        try:
            parsed = json.loads(content)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise FileValidationError("JSON inválido: não foi possível interpretar o arquivo.") from exc
        # Protecao basica contra JSON-bomb: profundidade de aninhamento.
        if _json_depth(parsed) > 4:
            raise FileValidationError(
                "JSON aninhado demais — cada linha deve ser um objeto simples (chave: valor)."
            )


def _json_depth(value: object, current: int = 0) -> int:
    if current > 10:  # corta cedo — nao precisa medir profundidade exata de algo ja rejeitavel
        return current
    if isinstance(value, dict) and value:
        return max(_json_depth(v, current + 1) for v in value.values())
    if isinstance(value, list) and value:
        return max(_json_depth(v, current + 1) for v in value)
    return current


# Prefixos que o Excel/Sheets interpretam como inicio de formula — um valor
# de texto vindo de dado importado (nome de produto/campanha etc. em
# dominios futuros) nunca deve ser escrito cru se comecar com um deles,
# senao a fórmula roda ao abrir a planilha exportada (CSV/Spreadsheet
# Formula Injection). Usado pelos exporters (PR seguinte, exportação).
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def sanitize_for_spreadsheet(value: str) -> str:
    if value and value[0] in _FORMULA_PREFIXES:
        return "'" + value
    return value
