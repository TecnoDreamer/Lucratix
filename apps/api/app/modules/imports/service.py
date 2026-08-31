"""Orquestra o pipeline (upload -> sugestao -> mapeamento -> validacao ->
preview -> confirmacao), delegando cada etapa para o modulo especializado
(parsers/mapping/transform/validation/writers). O router so traduz
HTTP <-> este modulo; nenhuma regra de negocio fica no router."""

import uuid
from collections.abc import Callable
from datetime import date
from typing import cast

from sqlalchemy.orm import Session

from app.models.import_job import ImportJob, ImportJobStatus
from app.modules.imports import repository
from app.modules.imports.domains import DomainSpec, get_domain
from app.modules.imports.mapping import MappingSuggestion, normalize_header, suggest_mapping
from app.modules.imports.parsers import parse_file
from app.modules.imports.security import FileValidationError, validate_file
from app.modules.imports.validation import ValidationSummary, validate_rows
from app.modules.imports.writers import DOMAIN_WRITERS


class ImportStateError(Exception):
    """Acao pedida nao e valida para o estado atual do job (ex.: confirmar
    sem ter mapeado antes) — o router traduz para HTTP 400."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class DomainNotFoundError(Exception):
    def __init__(self, domain_key: str):
        self.message = f'Domínio "{domain_key}" não é suportado para importação.'
        super().__init__(self.message)


def _json_safe(value: object) -> object:
    """JSONB nao serializa `date`/`datetime` nativamente — convertidos para
    ISO ao persistir `raw_rows`. `transform.py::parse_date` já aceita tanto
    string ISO quanto objeto `date`, entao o round-trip não perde informação."""
    if isinstance(value, date):
        return value.isoformat()
    return value


def _require_domain(domain_key: str) -> DomainSpec:
    domain = get_domain(domain_key)
    if domain is None:
        raise DomainNotFoundError(domain_key)
    return domain


# Mesma ideia de DOMAIN_WRITERS (writers.py)/DOMAIN_READERS (exports/readers.py)
# — um dicionario por dominio em vez de crescer um if/elif a cada dominio novo.
_NATURAL_KEY_LOOKUPS: dict[str, Callable[[Session, uuid.UUID], set[tuple[object, ...]]]] = {
    "financial_periods": repository.get_existing_financial_periods,
    "funnel_snapshots": repository.get_existing_funnel_snapshot_periods,
    "products": repository.get_existing_product_names,
    "campaigns": repository.get_existing_campaign_keys,
}


def _existing_natural_keys(
    db: Session, organization_id: uuid.UUID, domain_key: str
) -> set[tuple[object, ...]]:
    lookup = _NATURAL_KEY_LOOKUPS.get(domain_key)
    if lookup is None:
        return set()
    return lookup(db, organization_id)


def _campaign_foreign_key_values(db: Session, organization_id: uuid.UUID) -> dict[str, set[object]]:
    return {"channel": repository.get_valid_channel_names(db, organization_id)}


# Mesmo padrão dos dois dicionários acima — só Campanhas precisa disso hoje
# (campo de texto que precisa apontar pra um registro que já existe em
# OUTRA tabela; ver validation.py::validate_rows, parâmetro
# `foreign_key_values`, e a decisão de nunca criar canal por adivinhação).
_FOREIGN_KEY_LOOKUPS: dict[str, Callable[[Session, uuid.UUID], dict[str, set[object]]]] = {
    "campaigns": _campaign_foreign_key_values,
}


def _foreign_key_values(db: Session, organization_id: uuid.UUID, domain_key: str) -> dict[str, set[object]]:
    lookup = _FOREIGN_KEY_LOOKUPS.get(domain_key)
    if lookup is None:
        return {}
    return lookup(db, organization_id)


def _get_remembered_mapping(db: Session, organization_id: uuid.UUID, domain_key: str) -> dict[str, str]:
    """Ultimo mapeamento confirmado com sucesso pela mesma organizacao,
    neste dominio — "historico de mapeamentos aprovados daquela empresa"
    (prompt mestre, secao 8), normalizado por cabecalho."""
    completed_statuses = (ImportJobStatus.COMPLETED.value, ImportJobStatus.COMPLETED_WITH_ERRORS.value)
    recent = repository.list_import_jobs(db, organization_id, domain=domain_key, limit=20)
    for job in recent:
        if job.status in completed_statuses and job.mapping:
            return {normalize_header(header): field for header, field in job.mapping.items() if field}
    return {}


def create_import_job_from_upload(
    db: Session,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    domain_key: str,
    filename: str,
    file_format: str,
    content: bytes,
    sheet_name: str | None = None,
) -> tuple[ImportJob, list[MappingSuggestion]]:
    domain = _require_domain(domain_key)
    validate_file(filename=filename, content=content, declared_format=file_format)
    # SheetSelectionRequiredError (xlsx com mais de uma aba, sem escolha
    # ainda) propaga para o router sem ser tratada aqui — nada é persistido
    # nesse caso (ver XlsxSheetSelectionRequired em schemas/import_job.py).
    parsed = parse_file(file_format, content, sheet_name=sheet_name)

    remembered = _get_remembered_mapping(db, organization_id, domain_key)
    suggestions = suggest_mapping(parsed.headers, domain, remembered)

    raw_rows = [
        {"row_number": i + 1, "values": {h: _json_safe(v) for h, v in row.items()}}
        for i, row in enumerate(parsed.rows)
    ]
    job = repository.create_import_job(
        db,
        organization_id=organization_id,
        created_by=user_id,
        domain=domain_key,
        source_filename=filename[:255],
        file_format=file_format,
        sheet_name=parsed.sheet_name,
        status=ImportJobStatus.MAPPING_REQUIRED.value,
        headers=parsed.headers,
        raw_rows=raw_rows,
        total_rows=len(parsed.rows),
    )
    db.flush()
    return job, suggestions


def get_validation_summary(db: Session, job: ImportJob) -> ValidationSummary:
    domain = _require_domain(job.domain)
    raw_rows = [cast("dict[str, object]", r["values"]) for r in job.raw_rows]
    existing_keys = _existing_natural_keys(db, job.organization_id, job.domain)
    foreign_keys = _foreign_key_values(db, job.organization_id, job.domain)
    return validate_rows(
        raw_rows, job.mapping or {}, domain, job.transform_config or {}, existing_keys, foreign_keys
    )


def save_mapping(
    db: Session, *, job: ImportJob, mapping: dict[str, str], transform_config: dict[str, object]
) -> ValidationSummary:
    domain = _require_domain(job.domain)

    job.mapping = mapping
    job.transform_config = transform_config
    summary = get_validation_summary(db, job)

    job.valid_rows = summary.valid
    job.invalid_rows = summary.invalid
    job.duplicate_rows = summary.duplicate

    required_fields = {f.canonical_name for f in domain.fields if f.required}
    mapped_fields = {v for v in mapping.values() if v}
    job.status = (
        ImportJobStatus.READY.value
        if required_fields.issubset(mapped_fields)
        else ImportJobStatus.MAPPING_REQUIRED.value
    )

    errors_payload: list[dict[str, object]] = [
        {"row_number": row.row_number, "field": err.field, "message": err.message, "raw_value": err.raw_value}
        for row in summary.rows
        for err in row.errors
    ]
    repository.replace_import_errors(db, job.id, errors_payload)
    db.flush()
    return summary


def confirm_import(db: Session, *, job: ImportJob, duplicate_strategy: str) -> ImportJobStatus:
    if job.status != ImportJobStatus.READY.value:
        raise ImportStateError(
            "Este job não está pronto para confirmação — revise o mapeamento primeiro."
        )

    writer = DOMAIN_WRITERS.get(job.domain)
    if writer is None:
        raise DomainNotFoundError(job.domain)

    summary = get_validation_summary(db, job)
    created = updated = skipped = 0
    for row in summary.rows:
        if row.status == "invalid":
            continue
        outcome = writer(
            db,
            organization_id=job.organization_id,
            transformed=row.transformed,
            duplicate_strategy=duplicate_strategy,
            is_duplicate=(row.status == "duplicate"),
        )
        if outcome == "created":
            created += 1
        elif outcome == "updated":
            updated += 1
        else:
            skipped += 1

    job.created_rows = created
    job.updated_rows = updated
    job.skipped_rows = skipped
    job.status = (
        ImportJobStatus.COMPLETED.value
        if summary.invalid == 0
        else ImportJobStatus.COMPLETED_WITH_ERRORS.value
    )
    db.flush()
    return ImportJobStatus(job.status)


def cancel_import(db: Session, *, job: ImportJob) -> None:
    if job.status in (ImportJobStatus.COMPLETED.value, ImportJobStatus.COMPLETED_WITH_ERRORS.value):
        raise ImportStateError("Uma importação já concluída não pode ser cancelada.")
    job.status = ImportJobStatus.CANCELLED.value
    db.flush()


__all__ = [
    "FileValidationError",
    "DomainNotFoundError",
    "ImportStateError",
    "create_import_job_from_upload",
    "get_validation_summary",
    "save_mapping",
    "confirm_import",
    "cancel_import",
]
