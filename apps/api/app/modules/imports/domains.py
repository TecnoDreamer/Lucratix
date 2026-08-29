"""Registro de dominios importaveis — o ponto de extensao para adicionar um
novo dominio (Produtos, Marketing, Funil...) sem tocar no pipeline generico
de parsing/mapeamento/validacao (prompt mestre, secao 4: "arquitetura por
adaptadores"). Cada dominio so precisa de uma lista de `FieldSpec` aqui e de
uma funcao de escrita em `writers.py` — o resto (upload, mapeamento,
validacao, preview) e compartilhado.

Nesta primeira versao (corte vertical, 2026-08-29) so `financial_periods`
esta cadastrado — os demais dominios reais existentes (funnel_snapshots,
products, campaigns) entram em PRs seguintes reaproveitando esta mesma
estrutura. "Leads"/"Clientes" do prompt original NAO existem como tabela
no schema atual (sao so contadores agregados dentro de campaigns/
funnel_snapshots) — nao foram criados aqui; ver auditoria na PR.
"""

from dataclasses import dataclass, field
from typing import Literal

DataType = Literal["date", "decimal"]


@dataclass(frozen=True)
class FieldSpec:
    canonical_name: str
    display_name: str
    aliases: tuple[str, ...]
    data_type: DataType
    required: bool = False


@dataclass(frozen=True)
class DomainSpec:
    key: str
    display_name: str
    fields: tuple[FieldSpec, ...] = field(default_factory=tuple)
    # Campos que, junto de organization_id, formam a chave natural usada
    # para detectar duplicidade e decidir upsert (create vs update).
    natural_key: tuple[str, ...] = field(default_factory=tuple)


FINANCIAL_PERIODS = DomainSpec(
    key="financial_periods",
    display_name="Financeiro",
    natural_key=("period",),
    fields=(
        FieldSpec(
            "period",
            "Período",
            (
                "period",
                "periodo",
                "data",
                "mes",
                "data do periodo",
                "data de referencia",
                "reference_date",
                "competencia",
            ),
            "date",
            required=True,
        ),
        FieldSpec(
            "revenue",
            "Receita",
            ("revenue", "receita", "faturamento", "valor venda", "vendas", "total vendas"),
            "decimal",
        ),
        FieldSpec(
            "costs",
            "Custos",
            ("costs", "custos", "custo", "custo total"),
            "decimal",
        ),
        FieldSpec(
            "expenses",
            "Despesas",
            ("expenses", "despesas", "despesa"),
            "decimal",
        ),
        FieldSpec(
            "marketing_investment",
            "Investimento em marketing",
            (
                "marketing_investment",
                "investimento em marketing",
                "investimento marketing",
                "invest marketing",
                "ads spend",
                "gasto marketing",
                "gasto com marketing",
            ),
            "decimal",
        ),
        FieldSpec(
            "taxes",
            "Impostos",
            ("taxes", "impostos", "imposto"),
            "decimal",
        ),
    ),
)

DOMAIN_REGISTRY: dict[str, DomainSpec] = {
    FINANCIAL_PERIODS.key: FINANCIAL_PERIODS,
}


def get_domain(key: str) -> DomainSpec | None:
    return DOMAIN_REGISTRY.get(key)
