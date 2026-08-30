"""Registro de dominios importaveis — o ponto de extensao para adicionar um
novo dominio (Marketing...) sem tocar no pipeline generico de parsing/
mapeamento/validacao (prompt mestre, secao 4: "arquitetura por adaptadores").
Cada dominio so precisa de uma lista de `FieldSpec` aqui e de uma funcao de
escrita em `writers.py`/leitura em `exports/readers.py` — o resto (upload,
mapeamento, validacao, preview, serializacao) e compartilhado.

`financial_periods` (2026-08-29), `funnel_snapshots` (2026-08-29) e
`products` (2026-08-29) estao cadastrados — `campaigns` fica para uma PR
seguinte: diferente dos tres ja feitos, toda campanha pertence a um canal
(`channel_id`), o que exige decidir como resolver o canal a partir do nome
escrito no arquivo (buscar existente? criar se nao existir?) antes de caber
nesta mesma estrutura — decisao de negocio, nao so tecnica, adiada de
proposito em vez de resolvida no automatico. "Leads"/"Clientes" do prompt
original NAO existem como tabela propria no schema atual (sao contadores
agregados dentro de funnel_snapshots/campaigns, e `funnel_snapshots.leads`/
`funnel_snapshots.customers` ja cobrem o caso real) — nao foram criados
aqui; ver auditoria na PR.
"""

from dataclasses import dataclass, field
from typing import Literal

DataType = Literal["date", "decimal", "integer", "string", "boolean"]


@dataclass(frozen=True)
class FieldSpec:
    canonical_name: str
    display_name: str
    aliases: tuple[str, ...]
    data_type: DataType
    required: bool = False
    # Só usado por data_type "string" — mesmo limite da coluna no banco
    # (ex.: products.name/category são String(255)); rejeitado com erro
    # explícito em vez de deixar o banco recusar com um erro genérico.
    max_length: int | None = None


@dataclass(frozen=True)
class DomainSpec:
    key: str
    display_name: str
    fields: tuple[FieldSpec, ...] = field(default_factory=tuple)
    # Campos que, junto de organization_id, formam a chave natural usada
    # para detectar duplicidade e decidir upsert (create vs update).
    natural_key: tuple[str, ...] = field(default_factory=tuple)
    # False para domínios sem conceito de período (ex.: Produtos — um
    # catálogo, não uma série temporal) — o filtro de data do export é
    # ignorado/escondido para esses domínios (ver exports/readers.py e
    # o seletor de domínio no frontend).
    supports_date_range: bool = True


def normalize_natural_key_value(value: object) -> object:
    """Componente de texto da chave natural é comparado sem diferenciar
    maiúsculas/minúsculas nem espaços nas bordas — necessário para domínios
    como Produtos, cujo campo natural (`name`) não tem constraint de
    unicidade no banco (ao contrário de `period` em Financeiro/Funil, que já
    é a própria chave única da tabela); a deduplicação aqui é a única linha
    de defesa contra "Produto A" e "produto a" virarem dois registros.
    Usado tanto por `validation.py` (linhas do arquivo) quanto por
    `imports/repository.py` (linhas já existentes no banco) — precisa ser a
    mesma função dos dois lados, senão a comparação nunca bate."""
    if isinstance(value, str):
        return value.strip().lower()
    return value


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

FUNNEL_SNAPSHOTS = DomainSpec(
    key="funnel_snapshots",
    display_name="Funil",
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
        # Ordem espelha a etapa do funil (RN-006: ordem fixa das etapas),
        # mesma ordem de app/models/funnel_snapshot.py.
        FieldSpec(
            "impressions",
            "Impressões",
            ("impressions", "impressoes", "impressões", "views", "visualizacoes"),
            "integer",
        ),
        FieldSpec(
            "visits",
            "Visitas",
            ("visits", "visitas", "sessions", "sessoes", "sessões"),
            "integer",
        ),
        FieldSpec(
            "leads",
            "Leads",
            ("leads", "lead"),
            "integer",
        ),
        FieldSpec(
            "mqls",
            "MQLs",
            ("mqls", "mql", "leads qualificados marketing", "marketing qualified leads"),
            "integer",
        ),
        FieldSpec(
            "sqls",
            "SQLs",
            ("sqls", "sql", "leads qualificados vendas", "sales qualified leads"),
            "integer",
        ),
        FieldSpec(
            "opportunities",
            "Oportunidades",
            ("opportunities", "oportunidades", "oportunidade"),
            "integer",
        ),
        FieldSpec(
            "customers",
            "Clientes",
            ("customers", "clientes", "novos clientes", "vendas fechadas"),
            "integer",
        ),
        FieldSpec(
            "repeat_purchases",
            "Recompras",
            ("repeat_purchases", "recompras", "recompra", "clientes recorrentes", "repeat purchases"),
            "integer",
        ),
    ),
)

PRODUCTS = DomainSpec(
    key="products",
    display_name="Produtos",
    natural_key=("name",),
    supports_date_range=False,  # catálogo, não série temporal — sem "period"
    fields=(
        FieldSpec(
            "name",
            "Nome",
            ("name", "nome", "produto", "nome do produto", "product name", "servico", "serviço"),
            "string",
            required=True,
            max_length=255,
        ),
        FieldSpec(
            "category",
            "Categoria",
            ("category", "categoria"),
            "string",
            max_length=255,
        ),
        FieldSpec(
            "price",
            "Preço",
            ("price", "preco", "preço", "valor", "valor unitario", "valor unitário"),
            "decimal",
        ),
        FieldSpec(
            "cost",
            "Custo",
            ("cost", "custo"),
            "decimal",
        ),
        FieldSpec(
            "active",
            "Ativo",
            ("active", "ativo", "status"),
            "boolean",
        ),
    ),
)

DOMAIN_REGISTRY: dict[str, DomainSpec] = {
    FINANCIAL_PERIODS.key: FINANCIAL_PERIODS,
    FUNNEL_SNAPSHOTS.key: FUNNEL_SNAPSHOTS,
    PRODUCTS.key: PRODUCTS,
}


def get_domain(key: str) -> DomainSpec | None:
    return DOMAIN_REGISTRY.get(key)
