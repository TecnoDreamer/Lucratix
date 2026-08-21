# Notas de Schema e Estratégia de Banco

## Convenções

- Chave primária: `UUID` (gerado pela aplicação ou `gen_random_uuid()` do PostgreSQL) em todas as tabelas.
- Toda tabela tem `created_at timestamptz not null default now()`; tabelas mutáveis (não append-only) têm também `updated_at timestamptz`.
- Toda tabela pertencente a uma organização tem `organization_id uuid not null references organizations(id)`, com índice B-tree (e composto com colunas de período/filtro mais comuns).
- Sem soft delete generalizado. Soft delete só é usado onde há justificativa de negócio explícita: `products.active` (RN-014 — produto inativo permanece para preservar histórico de registros financeiros/campanhas que o referenciam).
- `baselines` e `audit_logs` são **append-only**: sem `UPDATE`/`DELETE` expostos pela aplicação (RN-002, RN-015). Reforçado tanto na camada de repositório quanto, quando viável, por permissão de banco restrita ao usuário de aplicação.

## Isolamento multi-tenant (RNF-002)

- Toda query de leitura/escrita em tabela com `organization_id` deve incluir esse filtro, derivado do contexto de autorização da requisição (membership ativa do usuário autenticado), nunca de um parâmetro cru vindo do cliente sem validação cruzada.
- Repositórios (camada `repository`) centralizam esse filtro — nenhuma query ad-hoc fora do repositório acessa essas tabelas diretamente. Isso torna o RNF-002 testável em um único ponto por entidade.
- Índice composto `(organization_id, period)` (ou equivalente) nas tabelas de série temporal (`financial_periods`, `funnel_snapshots`, `metric_snapshots`) para consultas de comparação de período.

## Integridade referencial

- `memberships.user_id` → `users.id`, `memberships.organization_id` → `organizations.id`, com `UNIQUE (user_id, organization_id)` — um usuário tem no máximo uma membership ativa por organização.
- `campaigns.channel_id` → `marketing_channels.id`, com constraint adicional (validada na camada de serviço, não apenas FK) garantindo que o canal pertence à mesma `organization_id` da campanha (RN-005).
- `metric_snapshots.metric_definition_id` → `metric_definitions.id`, preservando a versão da fórmula usada (lineage — seção 29 do prompt mestre).

## Unicidade

- `users.email` — `UNIQUE`.
- `financial_periods (organization_id, period)` — `UNIQUE` (um registro por organização/período; revisão de período é uma decisão de UX/API a documentar em ADR quando a Fase 10 for implementada).
- `metric_definitions.key` — `UNIQUE` por versão (`UNIQUE (key, version)`).

## Migrations

- Alembic, uma migration por mudança de schema coerente. Toda migration deve ter `downgrade()` implementado sempre que tecnicamente viável (RNF-013). Migrations que envolvem `baselines`/`audit_logs` nunca adicionam `UPDATE`/`DELETE` a essas tabelas.

## O que este documento não decide ainda

- Particionamento de tabelas de série temporal por data (desnecessário no volume esperado do MVP — reavaliar na Fase 18/Hardening se necessário).
- Criptografia de campo específico (ex.: CNPJ) — ver [data-classification.md](../security/data-classification.md) para classificação de sensibilidade; criptografia de campo fica preparada, não implementada, no MVP.
