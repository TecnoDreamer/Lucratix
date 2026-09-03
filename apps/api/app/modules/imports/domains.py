"""Registro de dominios importaveis — o ponto de extensao para adicionar um
novo dominio (Marketing...) sem tocar no pipeline generico de parsing/
mapeamento/validacao (prompt mestre, secao 4: "arquitetura por adaptadores").
Cada dominio so precisa de uma lista de `FieldSpec` aqui e de uma funcao de
escrita em `writers.py`/leitura em `exports/readers.py` — o resto (upload,
mapeamento, validacao, preview, serializacao) e compartilhado.

`financial_periods`, `funnel_snapshots`, `products` (todos 2026-08-29) e
`campaigns` (2026-08-30) estao cadastrados. Campanhas precisou de uma
decisao de negocio antes de caber nesta estrutura — toda campanha pertence
a um canal (`channel_id`), e o arquivo importado so traz o NOME do canal,
nunca o id. Decisao confirmada com o usuario: se o nome nao bate com nenhum
canal ja cadastrado na organizacao, a linha e invalida (nunca cria canal
automaticamente por adivinhacao — um erro de digitacao na planilha nao pode
virar um canal fantasma). "Leads"/"Clientes" do prompt original NAO existem
como tabela propria no schema atual (sao contadores agregados dentro de
funnel_snapshots/campaigns, e `funnel_snapshots.leads`/
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
    # False para domínios só-exportáveis (ex.: Auditoria — append-only por
    # design, RN-015; "importar" uma linha de auditoria de uma planilha
    # seria falsificar a trilha). `DOMAIN_REGISTRY` é compartilhado entre
    # import e export (ver módulo `exports/`); esta flag é o que impede um
    # domínio de virar destino de import só por existir aqui. Default True
    # preserva o comportamento dos domínios já cadastrados.
    importable: bool = True


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
    # "channel" entra na chave natural (igual a Campanhas) para que uma
    # linha por canal nunca colida com a linha agregada do mesmo período
    # nem com a de outro canal — em branco (aggregate) normaliza pra None
    # em todas as linhas agregadas, que colidem entre si normalmente.
    natural_key=("period", "channel"),
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
        # Opcional (ao contrário de Campanhas, onde "channel" é obrigatório):
        # em branco = linha agregada (o funil da organização como um todo),
        # o comportamento que já existia antes desta coluna existir. Quando
        # preenchido, precisa bater com um canal já cadastrado na
        # organização (mesma regra de Campanhas — nunca cria canal por
        # adivinhança a partir de erro de digitação).
        FieldSpec(
            "channel",
            "Canal",
            ("channel", "canal", "canal de marketing", "marketing channel"),
            "string",
            max_length=255,
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

CAMPAIGNS = DomainSpec(
    key="campaigns",
    display_name="Marketing",
    # Chave composta: "name" sozinho e ambiguo (duas campanhas podem ter o
    # mesmo nome em canais diferentes) — igual a Produtos, sem constraint de
    # unicidade no banco, entao a deduplicacao e so na camada de importacao.
    natural_key=("name", "channel"),
    fields=(
        # "channel" guarda o NOME do canal como texto — nunca o channel_id
        # (o arquivo importado nao tem acesso a esse id interno). A
        # resolucao nome -> canal existente acontece em validation.py
        # (foreign_key_values, ve service.py) e de novo em writers.py na
        # hora de gravar — linha cujo canal nao existe fica invalida, nunca
        # cria um canal automaticamente (decisao confirmada com o usuario).
        FieldSpec(
            "channel",
            "Canal",
            ("channel", "canal", "canal de marketing", "marketing channel"),
            "string",
            required=True,
            max_length=255,
        ),
        FieldSpec(
            "name",
            "Nome",
            ("name", "nome", "campanha", "nome da campanha", "campaign name"),
            "string",
            required=True,
            max_length=255,
        ),
        FieldSpec(
            "start_date",
            "Data de início",
            ("start_date", "data de inicio", "data de início", "data inicial", "inicio", "início"),
            "date",
        ),
        FieldSpec(
            "end_date",
            "Data de término",
            ("end_date", "data de termino", "data de término", "data final", "fim", "termino", "término"),
            "date",
        ),
        FieldSpec(
            "investment",
            "Investimento",
            ("investment", "investimento", "valor investido", "gasto", "budget"),
            "decimal",
        ),
        FieldSpec(
            "impressions",
            "Impressões",
            ("impressions", "impressoes", "impressões", "views"),
            "integer",
        ),
        FieldSpec(
            "clicks",
            "Cliques",
            ("clicks", "cliques", "clique"),
            "integer",
        ),
        FieldSpec(
            "leads",
            "Leads",
            ("leads", "lead"),
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
            ("customers", "clientes", "vendas", "conversoes", "conversões"),
            "integer",
        ),
        FieldSpec(
            "attributed_revenue",
            "Receita atribuída",
            (
                "attributed_revenue",
                "receita atribuida",
                "receita atribuída",
                "receita gerada",
                "receita da campanha",
            ),
            "decimal",
        ),
    ),
)

AUDIT_LOGS = DomainSpec(
    key="audit_logs",
    display_name="Auditoria",
    # Export-only (ver DomainSpec.importable acima) — sem chave natural
    # (upsert nao se aplica, nunca ha "linha existente" pra comparar).
    natural_key=(),
    importable=False,
    fields=(
        # `created_at` e na verdade `datetime`, nao `date` — mas
        # exports/serializers.py so checa `isinstance(value, date)` (datetime
        # e subclasse) e chama `.isoformat()`, entao funciona sem mudar o
        # serializer generico. `data_type` nunca alimenta parser de import
        # aqui, porque `importable=False` bloqueia isso mais cedo.
        FieldSpec("created_at", "Quando", (), "date"),
        FieldSpec("user_email", "Usuário", (), "string"),
        FieldSpec("action", "Ação", (), "string"),
        FieldSpec("entity", "Entidade", (), "string"),
        FieldSpec("entity_id", "ID da Entidade", (), "string"),
    ),
)

DOMAIN_REGISTRY: dict[str, DomainSpec] = {
    FINANCIAL_PERIODS.key: FINANCIAL_PERIODS,
    FUNNEL_SNAPSHOTS.key: FUNNEL_SNAPSHOTS,
    PRODUCTS.key: PRODUCTS,
    CAMPAIGNS.key: CAMPAIGNS,
    AUDIT_LOGS.key: AUDIT_LOGS,
}


def get_domain(key: str) -> DomainSpec | None:
    return DOMAIN_REGISTRY.get(key)
