"""RF-021, RF-022 — combina dados de financials/funnels e aplica o motor de
metricas (app/modules/metrics/engine.py). Camada fina: nao acessa o banco
diretamente (recebe os registros ja carregados), o que a torna testavel
sem infraestrutura (RNF-016).
"""

from dataclasses import dataclass

from app.models.financial_period import FinancialPeriod
from app.models.funnel_snapshot import FunnelSnapshot
from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult


@dataclass(frozen=True)
class AggregatedFinancials:
    """Soma de varios `FinancialPeriod` — mesmos nomes de campo do model,
    para servir como substituto estrutural em `compute_dashboard_metrics`
    (RF-023: dashboard/relatorio por intervalo de datas, nao so um mes).
    """

    revenue: float | None
    costs: float | None
    expenses: float | None
    marketing_investment: float | None
    taxes: float | None


@dataclass(frozen=True)
class AggregatedFunnel:
    # float, nao int: e soma de varios meses (`_sum_optional`), consumido
    # apenas pelo motor de metricas (Number | None) — nunca serializado
    # como contagem exata de um unico periodo.
    customers: float | None
    leads: float | None
    repeat_purchases: float | None


def _sum_optional(values: list[float | None]) -> float | None:
    """Soma ignorando ausencias — None so se NENHUM valor da lista existir
    (RN-003: dado ausente nunca vira zero). Com dado parcial (alguns meses
    do intervalo sem registro), soma o que existe; a completude fica
    explicita em `ExecutiveDashboardRead.periods_with_financial_data` /
    `total_months`, para a UI nunca apresentar um total parcial como se
    fosse o intervalo inteiro sem avisar.
    """
    present = [v for v in values if v is not None]
    if not present:
        return None
    return sum(present)


def aggregate_financials(periods: list[FinancialPeriod]) -> AggregatedFinancials:
    return AggregatedFinancials(
        revenue=_sum_optional([p.revenue for p in periods]),
        costs=_sum_optional([p.costs for p in periods]),
        expenses=_sum_optional([p.expenses for p in periods]),
        marketing_investment=_sum_optional([p.marketing_investment for p in periods]),
        taxes=_sum_optional([p.taxes for p in periods]),
    )


def aggregate_funnels(snapshots: list[FunnelSnapshot]) -> AggregatedFunnel:
    return AggregatedFunnel(
        customers=_sum_optional([s.customers for s in snapshots]),
        leads=_sum_optional([s.leads for s in snapshots]),
        repeat_purchases=_sum_optional([s.repeat_purchases for s in snapshots]),
    )


def compute_dashboard_metrics(
    financial: FinancialPeriod | AggregatedFinancials | None,
    funnel: FunnelSnapshot | AggregatedFunnel | None,
) -> dict[str, MetricResult]:
    """Aceita tanto um `FinancialPeriod`/`FunnelSnapshot` (um mes) quanto um
    `AggregatedFinancials`/`AggregatedFunnel` (soma de varios meses) — os
    dois tem os mesmos nomes de campo usados aqui, entao funcionam de forma
    intercambiavel (duck typing deliberado, ver dataclasses acima).
    """
    revenue = (
        MetricResult.ok(float(financial.revenue))
        if financial and financial.revenue is not None
        else MetricResult.missing_data("revenue")
    )

    profit_result = (
        engine.profit(
            revenue=financial.revenue if financial else None,
            costs=financial.costs if financial else None,
            expenses=financial.expenses if financial else None,
            taxes=financial.taxes if financial else None,
        )
        if financial
        else MetricResult.missing_data("revenue")
    )

    margin_result = engine.margin(
        revenue=financial.revenue if financial else None,
        profit=profit_result.value,
    )

    new_customers = funnel.customers if funnel else None
    cac_result = engine.cac(
        marketing_investment=financial.marketing_investment if financial else None,
        new_customers=new_customers,
    )

    conversion_result = engine.conversion_rate(
        conversions=new_customers,
        base=funnel.leads if funnel else None,
    )

    average_ticket_result = engine.average_ticket(
        revenue=financial.revenue if financial else None,
        count=new_customers,
    )

    recurrence_result = engine.recurrence_rate(
        repeat_customers=funnel.repeat_purchases if funnel else None,
        total_customers=new_customers,
    )

    return {
        "revenue": revenue,
        "profit": profit_result,
        "margin": margin_result,
        "cac": cac_result,
        "conversion_rate": conversion_result,
        "average_ticket": average_ticket_result,
        "recurrence_rate": recurrence_result,
    }
