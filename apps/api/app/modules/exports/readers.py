"""Leitura por domínio — a metade "adapter" que falta para completar o
pipeline generico de exportação (serializers.py cobre a escrita do arquivo).
Só financial_periods existe nesta primeira versão; um domínio novo (Funil,
Produtos...) só precisa de uma função equivalente aqui, reaproveitando o
repository do próprio módulo de domínio (mesmo padrão de writers.py, do lado
da importação — nunca duplicar a query de listagem).
"""

import uuid
from collections.abc import Callable
from datetime import date

from sqlalchemy.orm import Session

from app.modules.financials import repository as financials_repository


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


DomainReader = Callable[[Session, uuid.UUID, "date | None", "date | None"], list[dict[str, object]]]

DOMAIN_READERS: dict[str, DomainReader] = {
    "financial_periods": read_financial_period_rows,
}
