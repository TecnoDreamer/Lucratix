"""Sugestao automatica de mapeamento de campo (prompt mestre, secao 8).
Sugestao NAO e autorizacao: o resultado daqui e sempre so uma proposta
devolvida na resposta da API — quem persiste como `ImportJob.mapping` e a
confirmacao explicita do usuario (ver router.py). difflib.SequenceMatcher
(stdlib) resolve a similaridade textual sem precisar de nenhuma
dependencia nova nem de IA/LLM para algo que uma regra determinística já
resolve bem (prompt mestre, secao 39 — restrição explícita contra isso).
"""

import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Literal

from app.modules.imports.domains import DomainSpec

Confidence = Literal["alta", "media", "baixa", "sem_correspondencia"]

_HIGH_THRESHOLD = 0.92
_MEDIUM_THRESHOLD = 0.75
_LOW_THRESHOLD = 0.55


@dataclass(frozen=True)
class MappingSuggestion:
    header: str
    canonical_field: str | None
    confidence: Confidence
    display_name: str | None


def normalize_header(raw: str) -> str:
    """Minúsculo, sem acento, sem pontuação, espaços/`_`/`-` colapsados —
    para que "Data Pedido", "data_pedido" e "DATA-PEDIDO" comparem iguais."""
    text = unicodedata.normalize("NFKD", raw).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[_\-]+", " ", text)
    text = re.sub(r"[^a-z0-9 ]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _confidence_for_score(score: float) -> Confidence:
    if score >= _HIGH_THRESHOLD:
        return "alta"
    if score >= _MEDIUM_THRESHOLD:
        return "media"
    if score >= _LOW_THRESHOLD:
        return "baixa"
    return "sem_correspondencia"


def suggest_mapping(
    headers: list[str],
    domain: DomainSpec,
    remembered_mapping: dict[str, str] | None = None,
) -> list[MappingSuggestion]:
    """`remembered_mapping`: {header_normalizado: canonical_field}, vindo de
    um template salvo ou do mapeamento confirmado num import anterior da
    mesma organização — casa em "alta confiança" direto, sem depender de
    fuzzy matching de novo."""
    remembered = remembered_mapping or {}
    field_by_canonical = {f.canonical_name: f for f in domain.fields}

    suggestions: list[MappingSuggestion] = []
    for header in headers:
        normalized = normalize_header(header)

        if normalized in remembered and remembered[normalized] in field_by_canonical:
            canonical = remembered[normalized]
            suggestions.append(
                MappingSuggestion(header, canonical, "alta", field_by_canonical[canonical].display_name)
            )
            continue

        best_field: str | None = None
        best_score = 0.0
        for spec in domain.fields:
            candidates = (normalize_header(spec.canonical_name), *(normalize_header(a) for a in spec.aliases))
            for candidate in candidates:
                if normalized == candidate:
                    score = 1.0
                else:
                    score = SequenceMatcher(None, normalized, candidate).ratio()
                if score > best_score:
                    best_score = score
                    best_field = spec.canonical_name

        confidence = _confidence_for_score(best_score)
        canonical_field = best_field if confidence != "sem_correspondencia" else None
        display_name = field_by_canonical[canonical_field].display_name if canonical_field else None
        suggestions.append(MappingSuggestion(header, canonical_field, confidence, display_name))

    return suggestions
