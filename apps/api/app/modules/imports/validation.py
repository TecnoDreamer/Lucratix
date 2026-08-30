"""Validacao em camadas de Schema/Registro (prompt mestre, secao 13) — a
camada de Arquivo ja aconteceu em security.py no upload, e a de Negocio
(tenant/permissao) e responsabilidade do router (RNF-002/RN-010), nunca
deste modulo. Aqui: campo obrigatorio ausente, tipo invalido, duplicidade
(por chave natural do domínio) — sem persistir nada, so calcula.
"""

from dataclasses import dataclass, field
from typing import Literal

from app.modules.imports.domains import DomainSpec, FieldSpec, normalize_natural_key_value
from app.modules.imports.transform import (
    TransformError,
    parse_boolean,
    parse_date,
    parse_decimal,
    parse_integer,
    parse_string,
)

RowStatus = Literal["valid", "invalid", "duplicate"]


@dataclass(frozen=True)
class RowError:
    field: str | None
    message: str
    raw_value: str | None


@dataclass
class RowResult:
    row_number: int
    original: dict[str, object]
    transformed: dict[str, object] = field(default_factory=dict)
    status: RowStatus = "valid"
    errors: list[RowError] = field(default_factory=list)


@dataclass
class ValidationSummary:
    total: int
    valid: int
    invalid: int
    duplicate: int
    rows: list[RowResult]


def _transform_value(raw: object, spec: FieldSpec, transform_config: dict[str, object]) -> object:
    if spec.data_type == "decimal":
        return parse_decimal(raw)
    if spec.data_type == "integer":
        return parse_integer(raw)
    if spec.data_type == "string":
        return parse_string(raw, max_length=spec.max_length)
    if spec.data_type == "boolean":
        return parse_boolean(raw)
    if spec.data_type == "date":
        date_format = transform_config.get("date_format", "DMY")
        if date_format not in ("DMY", "MDY", "ISO"):
            date_format = "DMY"
        return parse_date(raw, date_format=date_format)  # type: ignore[arg-type]
    raise TransformError(f"Tipo de dado desconhecido: {spec.data_type}.")


def validate_rows(
    raw_rows: list[dict[str, object]],
    mapping: dict[str, str],
    domain: DomainSpec,
    transform_config: dict[str, object],
    existing_natural_keys: set[tuple[object, ...]],
    foreign_key_values: dict[str, set[object]] | None = None,
) -> ValidationSummary:
    """`mapping`: {header_original: canonical_field}. `existing_natural_keys`:
    chaves naturais (ex.: (period,)) já presentes no banco — usado para
    marcar duplicidade contra dado já existente, além de duplicidade
    dentro do próprio arquivo. `foreign_key_values`: {canonical_field: {valores
    normalizados válidos}} — para um campo de texto que precisa apontar para
    um registro que já existe em OUTRA tabela (ex.: Marketing: "channel" só é
    válido se já existe um canal com aquele nome na organização — nunca cria
    um canal por adivinhação a partir de um erro de digitação na planilha).
    Sem entrada nesse dict para um campo, nenhuma verificação é feita — é
    opcional, a maioria dos domínios não precisa."""
    fields_by_canonical = {f.canonical_name: f for f in domain.fields}
    required_fields = [f.canonical_name for f in domain.fields if f.required]
    foreign_key_values = foreign_key_values or {}

    seen_keys_in_file: set[tuple[object, ...]] = set()
    results: list[RowResult] = []

    for i, raw_row in enumerate(raw_rows):
        row_number = i + 1
        result = RowResult(row_number=row_number, original=raw_row)

        for header, canonical_field in mapping.items():
            if not canonical_field or canonical_field not in fields_by_canonical:
                continue
            spec = fields_by_canonical[canonical_field]
            raw_value = raw_row.get(header)
            try:
                result.transformed[canonical_field] = _transform_value(raw_value, spec, transform_config)
            except TransformError as exc:
                result.errors.append(
                    RowError(field=canonical_field, message=exc.message, raw_value=_as_display(raw_value))
                )

        for canonical_field in required_fields:
            if result.transformed.get(canonical_field) is None and not any(
                e.field == canonical_field for e in result.errors
            ):
                spec = fields_by_canonical[canonical_field]
                result.errors.append(
                    RowError(
                        field=canonical_field,
                        message=f'Campo obrigatório "{spec.display_name}" não foi preenchido.',
                        raw_value=None,
                    )
                )

        for canonical_field, valid_values in foreign_key_values.items():
            value = result.transformed.get(canonical_field)
            # None (não mapeado/em branco) já foi tratado acima, se
            # obrigatório — aqui só verifica quando há algo para checar.
            if value is None or any(e.field == canonical_field for e in result.errors):
                continue
            if normalize_natural_key_value(value) not in valid_values:
                spec = fields_by_canonical[canonical_field]
                result.errors.append(
                    RowError(
                        field=canonical_field,
                        message=(
                            f'{spec.display_name} "{value}" não encontrado nesta organização — '
                            "cadastre-o antes de importar."
                        ),
                        raw_value=_as_display(value),
                    )
                )

        if result.errors:
            result.status = "invalid"
        else:
            natural_key = tuple(
                normalize_natural_key_value(result.transformed.get(k)) for k in domain.natural_key
            )
            if natural_key in existing_natural_keys or natural_key in seen_keys_in_file:
                result.status = "duplicate"
            else:
                result.status = "valid"
            seen_keys_in_file.add(natural_key)

        results.append(result)

    valid = sum(1 for r in results if r.status == "valid")
    invalid = sum(1 for r in results if r.status == "invalid")
    duplicate = sum(1 for r in results if r.status == "duplicate")
    return ValidationSummary(
        total=len(results), valid=valid, invalid=invalid, duplicate=duplicate, rows=results
    )


def _as_display(value: object) -> str | None:
    if value is None:
        return None
    return str(value)[:500]
