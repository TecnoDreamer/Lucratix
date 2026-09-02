import uuid
from datetime import date
from typing import cast

from sqlalchemy.orm import Session

from app.models.funnel_snapshot import FunnelSnapshot


def list_funnel_snapshots(db: Session, organization_id: uuid.UUID) -> list[FunnelSnapshot]:
    """So a linha agregada (channel_id IS NULL) de cada periodo — usada pela
    tabela de entrada manual e pela exportacao, que ainda nao tem UI para
    editar/listar uma linha por canal (ver docs/funnel/MODELAGEM.md)."""
    return (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id == organization_id,
            FunnelSnapshot.channel_id.is_(None),
        )
        .order_by(FunnelSnapshot.period.desc())
        .all()
    )


def list_funnel_snapshots_in_range(
    db: Session, organization_id: uuid.UUID, date_from: date, date_to: date
) -> list[FunnelSnapshot]:
    """So linhas agregadas (channel_id IS NULL) — usada pelo dashboard e pela
    visao executiva, que ainda nao segmentam por canal."""
    return (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id == organization_id,
            FunnelSnapshot.channel_id.is_(None),
            FunnelSnapshot.period >= date_from.replace(day=1),
            FunnelSnapshot.period <= date_to,
        )
        .order_by(FunnelSnapshot.period.asc())
        .all()
    )


def list_all_funnel_snapshots(db: Session, organization_id: uuid.UUID) -> list[FunnelSnapshot]:
    """Todas as linhas (agregada + por canal), sem filtro — usada só pela
    exportação (Central de Dados), que precisa do dado completo
    independente de segmentação."""
    return (
        db.query(FunnelSnapshot)
        .filter(FunnelSnapshot.organization_id == organization_id)
        .order_by(FunnelSnapshot.period.desc())
        .all()
    )


def list_all_funnel_snapshots_in_range(
    db: Session, organization_id: uuid.UUID, date_from: date, date_to: date
) -> list[FunnelSnapshot]:
    """Igual a `list_all_funnel_snapshots`, com filtro de intervalo — usada
    pela exportação quando o usuário escolhe um período."""
    return (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id == organization_id,
            FunnelSnapshot.period >= date_from.replace(day=1),
            FunnelSnapshot.period <= date_to,
        )
        .order_by(FunnelSnapshot.period.asc())
        .all()
    )


def list_channel_funnel_snapshots_in_range(
    db: Session, organization_id: uuid.UUID, date_from: date, date_to: date
) -> list[FunnelSnapshot]:
    """Todas as linhas segmentadas por canal (channel_id IS NOT NULL) no
    intervalo — usada por GET /analytics/funnel/by-channel, que agrupa em
    Python por channel_id (mesmo padrao de
    marketing/repository.py::list_campaigns_in_range)."""
    return (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id == organization_id,
            FunnelSnapshot.channel_id.isnot(None),
            FunnelSnapshot.period >= date_from.replace(day=1),
            FunnelSnapshot.period <= date_to,
        )
        .order_by(FunnelSnapshot.period.asc())
        .all()
    )


def get_funnel_snapshot(
    db: Session, organization_id: uuid.UUID, period: date, channel_id: uuid.UUID | None = None
) -> FunnelSnapshot | None:
    channel_filter = (
        FunnelSnapshot.channel_id.is_(None) if channel_id is None else FunnelSnapshot.channel_id == channel_id
    )
    return (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id == organization_id,
            FunnelSnapshot.period == period,
            channel_filter,
        )
        .one_or_none()
    )


def list_funnel_snapshots_for_organizations(
    db: Session, organization_ids: list[uuid.UUID], period: date
) -> dict[uuid.UUID, FunnelSnapshot]:
    """Igual a `get_funnel_snapshot`, mas para varias organizacoes de uma vez
    em uma unica query — usado pelo resumo de `GET /organizations/summary`
    (lista "Suas empresas") para nao virar N+1 (uma query por empresa).
    So a linha agregada (channel_id IS NULL): sem o filtro, uma organizacao
    com linhas por canal no mesmo periodo faria o dict abaixo (chaveado so
    por organization_id) ficar com "a ultima linha que a query devolver",
    nao necessariamente a agregada.
    """
    if not organization_ids:
        return {}
    rows = (
        db.query(FunnelSnapshot)
        .filter(
            FunnelSnapshot.organization_id.in_(organization_ids),
            FunnelSnapshot.channel_id.is_(None),
            FunnelSnapshot.period == period,
        )
        .all()
    )
    return {row.organization_id: row for row in rows}


def upsert_funnel_snapshot(
    db: Session, *, organization_id: uuid.UUID, period: date, **fields: object
) -> FunnelSnapshot:
    # channel_id (se presente em fields) decide qual linha buscar: None ->
    # agregada, um id concreto -> a linha daquele canal. Sem isso, upsert de
    # uma linha por canal colidiria sempre com a linha agregada existente.
    channel_id = cast("uuid.UUID | None", fields.get("channel_id"))
    existing = get_funnel_snapshot(db, organization_id, period, channel_id=channel_id)
    if existing is not None:
        for key, value in fields.items():
            setattr(existing, key, value)
        db.flush()
        return existing

    record = FunnelSnapshot(organization_id=organization_id, period=period, **fields)
    db.add(record)
    db.flush()
    return record
