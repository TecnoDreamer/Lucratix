import uuid

from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.financial_period import FinancialPeriod
from app.models.funnel_snapshot import FunnelSnapshot
from app.models.import_error import ImportRowError
from app.models.import_job import ImportJob
from app.models.import_mapping_template import ImportMappingTemplate
from app.models.marketing_channel import MarketingChannel
from app.models.product import Product
from app.modules.imports.domains import normalize_natural_key_value


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


def get_existing_financial_periods(db: Session, organization_id: uuid.UUID) -> set[tuple[object, ...]]:
    rows = (
        db.query(FinancialPeriod.period)
        .filter(FinancialPeriod.organization_id == organization_id)
        .all()
    )
    return {(row.period,) for row in rows}


def get_existing_funnel_snapshot_periods(
    db: Session, organization_id: uuid.UUID
) -> set[tuple[object, ...]]:
    rows = (
        db.query(FunnelSnapshot.period)
        .filter(FunnelSnapshot.organization_id == organization_id)
        .all()
    )
    return {(row.period,) for row in rows}


def get_existing_product_names(db: Session, organization_id: uuid.UUID) -> set[tuple[object, ...]]:
    """Normalizado (minúsculo, sem espaço nas bordas) com a mesma função
    usada em validation.py — `name` não tem constraint de unicidade no
    banco, então os dois lados da comparação precisam concordar."""
    rows = db.query(Product.name).filter(Product.organization_id == organization_id).all()
    return {(normalize_natural_key_value(row.name),) for row in rows}


def get_existing_campaign_keys(db: Session, organization_id: uuid.UUID) -> set[tuple[object, ...]]:
    """Chave (nome da campanha, nome do canal) — nome de campanha sozinho é
    ambíguo (ver domains.py::CAMPAIGNS), e nenhum dos dois tem constraint de
    unicidade no banco. JOIN com marketing_channels só para pegar o nome do
    canal (a chave natural do import é por nome, nunca por channel_id)."""
    rows = (
        db.query(Campaign.name, MarketingChannel.name)
        .join(MarketingChannel, MarketingChannel.id == Campaign.channel_id)
        .filter(Campaign.organization_id == organization_id)
        .all()
    )
    return {
        (normalize_natural_key_value(campaign_name), normalize_natural_key_value(channel_name))
        for campaign_name, channel_name in rows
    }


def get_valid_channel_names(db: Session, organization_id: uuid.UUID) -> set[object]:
    """Usado por service.py para validar, na importação de Campanhas, se o
    canal escrito no arquivo já existe — nunca cria um canal por
    adivinhação (decisão confirmada com o usuário)."""
    rows = db.query(MarketingChannel.name).filter(MarketingChannel.organization_id == organization_id).all()
    return {normalize_natural_key_value(row.name) for row in rows}


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
