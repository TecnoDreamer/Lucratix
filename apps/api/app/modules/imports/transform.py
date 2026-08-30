"""Normalizacao de tipo/formato (prompt mestre, secao 10). Cada funcao
devolve o valor convertido ou levanta `TransformError` com uma mensagem
acionavel — nunca adivinha em silencio um formato ambiguo (ex.: data
DD/MM vs MM/DD): a direcao vem de `transform_config`, escolhida pelo
usuario no wizard (com uma sugestao inicial quando o proprio arquivo
desambiguiza, ex.: dia > 12).
"""

import re
from datetime import date, datetime
from typing import Literal

DateFormat = Literal["DMY", "MDY", "ISO"]


class TransformError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


_CURRENCY_SYMBOLS_RE = re.compile(r"r\$|us\$|\$|€|£", re.IGNORECASE)
_VALID_DECIMAL_RE = re.compile(r"-?[\d,.]+")


def parse_decimal(raw: object) -> float | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    if not isinstance(raw, str):
        raise TransformError(f"Valor numérico inesperado: {raw!r}.")

    text = raw.strip()
    if text == "":
        return None

    # Remove só simbolo de moeda conhecido e espacos ("R$ 1.250,50" ->
    # "1.250,50") — nunca descarta em silencio outro caractere (letra,
    # pontuacao estranha): sobrando algo fora do padrao numerico esperado,
    # isso é erro explícito, não um valor adivinhado (ex.: "12a34" não pode
    # virar 1234 sem avisar ninguém).
    candidate = _CURRENCY_SYMBOLS_RE.sub("", text)
    candidate = re.sub(r"\s+", "", candidate)
    if candidate in ("", "-"):
        return None
    if not _VALID_DECIMAL_RE.fullmatch(candidate):
        raise TransformError(f'Não foi possível interpretar "{raw}" como número.')

    has_comma = "," in candidate
    has_dot = "." in candidate
    if has_comma and has_dot:
        # O separador decimal e o que aparece por ultimo na string
        # ("1.250,50" -> decimal é vírgula; "1,250.50" -> decimal é ponto).
        if candidate.rfind(",") > candidate.rfind("."):
            candidate = candidate.replace(".", "").replace(",", ".")
        else:
            candidate = candidate.replace(",", "")
    elif has_comma:
        # So virgula: decimal se tiver 1-2 digitos depois dela, senao
        # separador de milhar ("1,5" -> 1.5; "1,500" -> 1500, ambíguo mas
        # tratado como milhar por ser o padrão mais comum em export cru).
        integer_part, _, fractional_part = candidate.rpartition(",")
        if len(fractional_part) <= 2:
            candidate = f"{integer_part.replace(',', '')}.{fractional_part}"
        else:
            candidate = candidate.replace(",", "")
    # Só ponto: já é o separador decimal do Python, nada a fazer.

    try:
        return float(candidate)
    except ValueError as exc:
        raise TransformError(f'Não foi possível interpretar "{raw}" como número.') from exc


def parse_integer(raw: object) -> int | None:
    """Contadores do funil (impressões, leads...) — reaproveita `parse_decimal`
    para herdar de graça a mesma resolução de separador de milhar/decimal
    ambíguo, e só rejeita o resultado se sobrar uma fração de verdade
    (ex.: "10.5" não é uma contagem válida)."""
    value = parse_decimal(raw)
    if value is None:
        return None
    if not value.is_integer():
        raise TransformError(f'Não foi possível interpretar "{raw}" como número inteiro.')
    return int(value)


def parse_string(raw: object, *, max_length: int | None = None) -> str | None:
    """Texto livre (ex.: nome/categoria de produto) — string vazia (depois de
    remover espaço nas bordas) vira None, igual aos outros tipos ("campo em
    branco" nunca é diferente de "não preenchido"). `max_length`, quando
    informado, espelha o limite da coluna no banco (ex.: String(255)) —
    rejeitado aqui com mensagem acionável em vez de deixar o INSERT falhar
    com um erro genérico do banco."""
    if raw is None:
        return None
    text = raw.strip() if isinstance(raw, str) else str(raw).strip()
    if text == "":
        return None
    if max_length is not None and len(text) > max_length:
        raise TransformError(
            f'Texto tem {len(text)} caracteres, acima do limite de {max_length}: "{text[:50]}...".'
        )
    return text


_TRUE_VALUES = {"true", "1", "sim", "yes", "y", "ativo", "verdadeiro"}
_FALSE_VALUES = {"false", "0", "nao", "não", "no", "n", "inativo", "falso"}


def parse_boolean(raw: object) -> bool | None:
    """Campo booleano (ex.: products.active) — aceita valores comuns em
    português e inglês; qualquer outra coisa é erro explícito, nunca um
    "truthy" adivinhado (ex.: não trata "talvez" como verdadeiro)."""
    if raw is None:
        return None
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, (int, float)):
        if raw in (0, 1):
            return bool(raw)
        raise TransformError(f"Não foi possível interpretar {raw!r} como verdadeiro/falso.")
    if not isinstance(raw, str):
        raise TransformError(f"Valor booleano inesperado: {raw!r}.")

    text = raw.strip().lower()
    if text == "":
        return None
    if text in _TRUE_VALUES:
        return True
    if text in _FALSE_VALUES:
        return False
    raise TransformError(f'Não foi possível interpretar "{raw}" como verdadeiro/falso.')


_ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_SLASH_OR_DASH_RE = re.compile(r"^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$")


def parse_date(raw: object, date_format: DateFormat = "DMY") -> date | None:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw
    if not isinstance(raw, str):
        raise TransformError(f"Data inesperada: {raw!r}.")

    text = raw.strip()
    if text == "":
        return None

    # ISO (YYYY-MM-DD) nunca é ambíguo — sempre tentado primeiro,
    # independente do date_format escolhido.
    if _ISO_RE.match(text):
        try:
            return date.fromisoformat(text)
        except ValueError as exc:
            raise TransformError(f'Data inválida: "{raw}".') from exc

    match = _SLASH_OR_DASH_RE.match(text)
    if not match:
        raise TransformError(
            f'Não foi possível interpretar "{raw}" como data. '
            "Formatos aceitos: AAAA-MM-DD, DD/MM/AAAA ou MM/DD/AAAA."
        )

    a, b, c = match.groups()
    # Ano na primeira posição (ex.: "2026/08/29") — só o ISO com separador
    # trocado, sempre YYYY/MM/DD.
    if len(a) == 4:
        year, month, day = int(a), int(b), int(c)
    else:
        first, second, year = int(a), int(b), int(c)
        if date_format == "MDY":
            month, day = first, second
        else:  # DMY (padrão)
            day, month = first, second

    try:
        return date(year, month, day)
    except ValueError as exc:
        raise TransformError(f'Data inválida: "{raw}".') from exc
