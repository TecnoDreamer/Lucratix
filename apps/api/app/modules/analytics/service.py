"""RF-021, RF-022 — combina dados de financials/funnels e aplica o motor de
metricas (app/modules/metrics/engine.py). Camada fina: nao acessa o banco
diretamente (recebe os registros ja carregados), o que a torna testavel
sem infraestrutura (RNF-016).
"""

from app.models.financial_period import FinancialPeriod
from app.models.funnel_snapshot import FunnelSnapshot
from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult


def compute_dashboard_metrics(
    financial: FinancialPeriod | None,
    funnel: FunnelSnapshot | None,
) -> dict[str, MetricResult]:
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
