import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.financial_period import FinancialPeriod
from app.models.import_error import ImportRowError
from app.models.import_job import ImportJob
from app.models.import_mapping_template import ImportMappingTemplate


def create_import_job(
    db: Session, *, organization_id: uuid.UUID, created_by: uuid.UUID, **fields: object
) -> ImportJob:
    job = ImportJob(organization_id=organization_id, created_by=created_by, **fields)
    db.add(job)
    db.flush()
    return job


def get_import_job(db: Session, organization_id: uuid.UUID, job_id: uuid.UUID) -> ImportJob | None:
    return (
        db.query(ImportJob)
        .filter(ImportJob.organization_id == organization_id, ImportJob.id == job_id)
        .one_or_none()
    )


def list_import_jobs(
    db: Session, organization_id: uuid.UUID, *, domain: str | None = None, limit: int = 50, offset: int = 0
) -> list[ImportJob]:
    query = db.query(ImportJob).filter(ImportJob.organization_id == organization_id)
    if domain:
        query = query.filter(ImportJob.domain == domain)
    return query.order_by(ImportJob.created_at.desc()).offset(offset).limit(limit).all()


def count_import_jobs(db: Session, organization_id: uuid.UUID, *, domain: str | None = None) -> int:
    query = db.query(ImportJob).filter(ImportJob.organization_id == organization_id)
    if domain:
        query = query.filter(ImportJob.domain == domain)
    return query.count()


def replace_import_errors(
    db: Session, import_job_id: uuid.UUID, errors: list[dict[str, object]]
) -> None:
    """A validacao e recalculada do zero a cada chamada de PUT /mapping —
    os erros persistidos sempre refletem a ULTIMA validacao, nunca um
    historico acumulado (nao faria sentido acumular erro de um mapeamento
    que o usuario ja corrigiu)."""
    db.query(ImportRowError).filter(ImportRowError.import_job_id == import_job_id).delete()
    for error in errors:
        db.add(ImportRowError(import_job_id=import_job_id, **error))


def list_import_errors(
    db: Session, import_job_id: uuid.UUID, *, limit: int = 100, offset: int = 0
) -> list[ImportRowError]:
    return (
        db.query(ImportRowError)
        .filter(ImportRowError.import_job_id == import_job_id)
        .order_by(ImportRowError.row_number.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_import_errors(db: Session, import_job_id: uuid.UUID) -> int:
    return db.query(ImportRowError).filter(ImportRowError.import_job_id == import_job_id).count()


def get_existing_financial_periods(db: Session, organization_id: uuid.UUID) -> set[tuple[date]]:
    rows = (
        db.query(FinancialPeriod.period)
        .filter(FinancialPeriod.organization_id == organization_id)
        .all()
    )
    return {(row.period,) for row in rows}


def create_mapping_template(
    db: Session, *, organization_id: uuid.UUID, created_by: uuid.UUID, **fields: object
) -> ImportMappingTemplate:
    template = ImportMappingTemplate(organization_id=organization_id, created_by=created_by, **fields)
    db.add(template)
    db.flush()
    return template


def list_mapping_templates(
    db: Session, organization_id: uuid.UUID, *, domain: str | None = None
) -> list[ImportMappingTemplate]:
    query = db.query(ImportMappingTemplate).filter(ImportMappingTemplate.organization_id == organization_id)
    if domain:
        query = query.filter(ImportMappingTemplate.domain == domain)
    return query.order_by(ImportMappingTemplate.name).all()
