"""Métricas de marketing agregadas por campanha — ROAS, ROI, CTR, CPC, CPM,
CPL, CPA. Separado de `service.py` (que cobre financials/funnels) porque a
fonte de dado e o formato de agregação são diferentes: campanhas têm um
intervalo próprio (`start_date`/`end_date`), não um período mensal fixo.
"""

from dataclasses import dataclass

from app.models.campaign import Campaign
from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult


@dataclass(frozen=True)
class AggregatedCampaigns:
    investment: float | None
    impressions: float | None
    clicks: float | None
    leads: float | None
    customers: float | None
    attributed_revenue: float | None


def _sum_optional(values: list[float | None]) -> float | None:
    present = [v for v in values if v is not None]
    if not present:
        return None
    return sum(present)


def aggregate_campaigns(campaigns: list[Campaign]) -> AggregatedCampaigns:
    return AggregatedCampaigns(
        investment=_sum_optional([c.investment for c in campaigns]),
        impressions=_sum_optional([c.impressions for c in campaigns]),
        clicks=_sum_optional([c.clicks for c in campaigns]),
        leads=_sum_optional([c.leads for c in campaigns]),
        customers=_sum_optional([c.customers for c in campaigns]),
        attributed_revenue=_sum_optional([c.attributed_revenue for c in campaigns]),
    )


def compute_marketing_metrics(aggregated: AggregatedCampaigns) -> dict[str, MetricResult]:
    return {
        "roas": engine.roas(
            attributed_revenue=aggregated.attributed_revenue, investment=aggregated.investment
        ),
        "roi": engine.roi(
            attributed_revenue=aggregated.attributed_revenue, investment=aggregated.investment
        ),
        "ctr": engine.ctr(clicks=aggregated.clicks, impressions=aggregated.impressions),
        "cpc": engine.cpc(investment=aggregated.investment, clicks=aggregated.clicks),
        "cpm": engine.cpm(investment=aggregated.investment, impressions=aggregated.impressions),
        "cpl": engine.cpl(investment=aggregated.investment, leads=aggregated.leads),
        # RN: "conversao" de CPA aqui e cliente adquirido (customers), mesmo
        # criterio ja usado por CAC no dashboard executivo (service.py) —
        # nao "lead" nem "oportunidade", para nao ter dois significados de
        # "conversao" dentro do mesmo produto.
        "cpa": engine.cpa(investment=aggregated.investment, conversions=aggregated.customers),
    }
