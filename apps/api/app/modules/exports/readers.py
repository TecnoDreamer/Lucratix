"""Leitura por domínio — a metade "adapter" que falta para completar o
pipeline generico de exportação (serializers.py cobre a escrita do arquivo).
Um domínio novo (Produtos...) só precisa de uma função equivalente aqui,
reaproveitando o repository do próprio módulo de domínio (mesmo padrão de
writers.py, do lado da importação — nunca duplicar a query de listagem).
"""

import uuid
from collections.abc import Callable
from datetime import date

from sqlalchemy.orm import Session

from app.modules.financials import repository as financials_repository
from app.modules.funnels import repository as funnels_repository
from app.modules.marketing import repository as marketing_repository
from app.modules.products import repository as products_repository


def read_financial_period_rows(
    db: Session, organization_id: uuid.UUID, date_from: date | None, date_to: date | None
) -> list[dict[str, object]]:
    """Devolve linhas no formato canônico do domínio (mesmas chaves de
    `domains.FINANCIAL_PERIODS.fields`), prontas para os serializers —
    nunca o formato de exibição (isso é responsabilidade de serializers.py,
    que sabe se o destino é CSV/XLSX com cabeçalho amigável ou JSON com
    chave canônica)."""
    if date_from is not None and date_to is not None:
        periods = financials_repository.list_financial_periods_in_range(
            db, organization_id, date_from, date_to
        )
    else:
        periods = financials_repository.list_financial_periods(db, organization_id)

    rows = [
        {
            "period": p.period,
            "revenue": float(p.revenue) if p.revenue is not None else None,
            "costs": float(p.costs) if p.costs is not None else None,
            "expenses": float(p.expenses) if p.expenses is not None else None,
            "marketing_investment": (
                float(p.marketing_investment) if p.marketing_investment is not None else None
            ),
            "taxes": float(p.taxes) if p.taxes is not None else None,
        }
        for p in periods
    ]
    # `list_financial_periods` (sem filtro de data) ordena desc (mais recente
    # primeiro, para a tela); `list_financial_periods_in_range` ordena asc —
    # um arquivo exportado faz mais sentido sempre em ordem cronológica,
    # independente de qual repository respondeu.
    return sorted(rows, key=lambda r: r["period"])  # type: ignore[arg-type,return-value]


def read_funnel_snapshot_rows(
    db: Session, organization_id: uuid.UUID, date_from: date | None, date_to: date | None
) -> list[dict[str, object]]:
    if date_from is not None and date_to is not None:
        snapshots = funnels_repository.list_funnel_snapshots_in_range(
            db, organization_id, date_from, date_to
        )
    else:
        snapshots = funnels_repository.list_funnel_snapshots(db, organization_id)

    # Colunas Integer do SQLAlchemy ja vem como `int`/`None` (ao contrario de
    # Numeric -> Decimal do financeiro), entao nao precisa de conversao aqui.
    rows = [
        {
            "period": s.period,
            "impressions": s.impressions,
            "visits": s.visits,
            "leads": s.leads,
            "mqls": s.mqls,
            "sqls": s.sqls,
            "opportunities": s.opportunities,
            "customers": s.customers,
            "repeat_purchases": s.repeat_purchases,
        }
        for s in snapshots
    ]
    return sorted(rows, key=lambda r: r["period"])  # type: ignore[arg-type,return-value]


def read_product_rows(
    db: Session, organization_id: uuid.UUID, date_from: date | None, date_to: date | None
) -> list[dict[str, object]]:
    """Produtos é um catálogo, não uma série temporal — `date_from`/
    `date_to` são ignorados de propósito (`DomainSpec.supports_date_range =
    False`, ver domains.py; o frontend nem oferece o filtro para este
    domínio). Inclui produtos inativos (RN-014: nunca excluídos de
    verdade) — um export completo não pode omitir histórico."""
    products = products_repository.list_products(db, organization_id, include_inactive=True)
    rows: list[dict[str, object]] = [
        {
            "name": p.name,
            "category": p.category,
            "price": float(p.price) if p.price is not None else None,
            "cost": float(p.cost) if p.cost is not None else None,
            "active": p.active,
        }
        for p in products
    ]
    return sorted(rows, key=lambda r: str(r["name"]).lower())


def read_campaign_rows(
    db: Session, organization_id: uuid.UUID, date_from: date | None, date_to: date | None
) -> list[dict[str, object]]:
    """"channel" sai como o NOME do canal, não o channel_id interno — busca
    em lote (evita N+1) via `get_channels_by_ids`, já que Campaign não tem
    relationship ORM para MarketingChannel (nenhum join automático)."""
    if date_from is not None and date_to is not None:
        campaigns = marketing_repository.list_campaigns_in_range(db, organization_id, date_from, date_to)
    else:
        campaigns = marketing_repository.list_campaigns(db, organization_id)

    channel_ids = {c.channel_id for c in campaigns}
    channels_by_id = marketing_repository.get_channels_by_ids(db, organization_id, channel_ids)

    rows: list[dict[str, object]] = [
        {
            "channel": channels_by_id[c.channel_id].name if c.channel_id in channels_by_id else None,
            "name": c.name,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "investment": float(c.investment) if c.investment is not None else None,
            "impressions": c.impressions,
            "clicks": c.clicks,
            "leads": c.leads,
            "opportunities": c.opportunities,
            "customers": c.customers,
            "attributed_revenue": float(c.attributed_revenue) if c.attributed_revenue is not None else None,
        }
        for c in campaigns
    ]
    # Campanha sem nenhuma data (start_date e end_date nulos) vai para o
    # fim, em vez de quebrar a ordenação — mesma regra de
    # list_campaigns_in_range (RF-023) de tratar "sem data" como um caso à
    # parte, nunca ordenado como se fosse anterior a tudo.
    return sorted(rows, key=lambda r: (r["start_date"] is None, r["start_date"] or date.min))


DomainReader = Callable[[Session, uuid.UUID, "date | None", "date | None"], list[dict[str, object]]]

DOMAIN_READERS: dict[str, DomainReader] = {
    "financial_periods": read_financial_period_rows,
    "funnel_snapshots": read_funnel_snapshot_rows,
    "products": read_product_rows,
    "campaigns": read_campaign_rows,
}
