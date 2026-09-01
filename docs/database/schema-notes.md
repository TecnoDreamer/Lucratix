# Notas de Schema e Estratégia de Banco

## Convenções

- Chave primária: `UUID` (gerado pela aplicação ou `gen_random_uuid()` do PostgreSQL) em todas as tabelas.
- Toda tabela tem `created_at timestamptz not null default now()`; tabelas mutáveis (não append-only) têm também `updated_at timestamptz`.
- Toda tabela pertencente a uma organização tem `organization_id uuid not null references organizations(id)`, com índice B-tree (e composto com colunas de período/filtro mais comuns).
- Sem soft delete generalizado. Soft delete só é usado onde há justificativa de negócio explícita: `products.active` (RN-014 — produto inativo permanece para preservar histórico de registros financeiros/campanhas que o referenciam).
- `baselines` e `audit_logs` são **append-only**: sem `UPDATE`/`DELETE` expostos pela aplicação (RN-002, RN-015). Reforçado tanto na camada de repositório quanto, quando viável, por permissão de banco restrita ao usuário de aplicação.
- Métricas (CAC, ROAS, conversão, margem etc.) não são persistidas — `app/modules/metrics/engine.py` as calcula sob demanda a partir de `financial_periods`/`funnel_snapshots`/`campaigns` a cada request. Não existe tabela `metric_snapshots`/`metric_definitions` (ver nota em [er-diagram.md](er-diagram.md)).

## Procedures, functions, triggers, views e RLS

Auditoria de banco de 2026-08-27: nenhum desses recursos existe hoje, e nenhum foi criado nesta revisão. Cada consulta auditada (dashboard, analytics, produtos, financeiro, marketing, funil, relatórios, auditoria) já roda em poucas queries diretas, sem N+1; as fórmulas de métrica já vivem só em `metrics/engine.py` (criar function equivalente em SQL duplicaria a mesma regra em dois lugares); `updated_at` já é resolvido via `onupdate` do SQLAlchemy; auditoria de ação de negócio já é registrada explicitamente na camada de aplicação (`record_audit`); e RLS exigiria replumbing de sessão (`SET LOCAL`) sem ganho sobre o isolamento por `organization_id` já testado (`tests/integration/test_multi_tenant_isolation.py`) e sem vazamento encontrado. Reavaliar se/quando um desses pontos deixar de ser verdade.

## Isolamento multi-tenant (RNF-002)

- Toda query de leitura/escrita em tabela com `organization_id` deve incluir esse filtro, derivado do contexto de autorização da requisição (membership ativa do usuário autenticado), nunca de um parâmetro cru vindo do cliente sem validação cruzada.
- Repositórios (camada `repository`) centralizam esse filtro — nenhuma query ad-hoc fora do repositório acessa essas tabelas diretamente. Isso torna o RNF-002 testável em um único ponto por entidade.
- Índice composto `(organization_id, period)` (ou equivalente) nas tabelas de série temporal (`financial_periods`, `funnel_snapshots`), via a própria `UNIQUE (organization_id, period)` de cada uma.
- Índice composto `(organization_id, created_at)` em `audit_logs`, `baselines` e `experiments` (migration `0008_performance_indexes`) — as três são sempre lidas com `ORDER BY created_at DESC` depois do filtro por organização; existia antes só o índice de coluna única em `organization_id`, sem suporte para a ordenação.
- Índice composto `(organization_id, start_date)` em `campaigns` (mesma migration) — cobre a listagem simples (`ORDER BY start_date`) e parcialmente o filtro de intervalo usado por `/analytics/marketing`; não cobre o lado `end_date` do filtro de sobreposição, que segue sem índice dedicado (sem evidência de que isso seja necessário no volume atual de campanhas por organização).

## Integridade referencial

- `memberships.user_id` → `users.id`, `memberships.organization_id` → `organizations.id`, com `UNIQUE (user_id, organization_id)` — um usuário tem no máximo uma membership ativa por organização.
- `campaigns.channel_id` → `marketing_channels.id`, com constraint adicional (validada na camada de serviço, não apenas FK) garantindo que o canal pertence à mesma `organization_id` da campanha (RN-005).

## Unicidade

- `users.email` — `UNIQUE`.
- `users.locale` (`String(5)`, nullable, migration `0015_user_locale_preference`, 2026-09-01) — idioma de UI preferido (`pt-BR`/`en`/`es`), atualizado via `PATCH /api/v1/auth/locale`. Nullable de propósito, mesma semântica tri-state de `user_workspace_preferences.quick_access` (ver abaixo): `NULL` = "nunca escolheu, usa o padrão pt-BR", nunca `"pt-BR"` gravado explicitamente no primeiro carregamento — evita ter que fazer um backfill se o padrão mudar um dia. Cookie `NEXT_LOCALE` guarda a mesma preferência no lado do browser (leitura imediata em toda renderização de servidor, sem round-trip); esta coluna existe só para sincronizar entre dispositivos (ver [docs/i18n/README.md](../i18n/README.md) e [ADR-0009](../adr/0009-estrategia-i18n.md)).
- `financial_periods (organization_id, period)` — `UNIQUE` (um registro por organização/período; revisão de período é uma decisão de UX/API a documentar em ADR quando a Fase 10 for implementada).
- `funnel_snapshots (organization_id, period)` — `UNIQUE`, mesmo racional.
- `user_workspace_preferences (user_id, organization_id)` — `UNIQUE` (uma preferência por usuário+empresa, migration `0013_user_workspace_preferences`, 2026-08-31). Coluna `quick_access` (JSONB) é **nullable de propósito**: `NULL` = "nunca configurou, usar o padrão", diferente de `[]` = "desativou todos os cards" — "Restaurar padrão" grava `NULL`, não a lista padrão atual, para que um card novo adicionado numa versão futura apareça automaticamente para quem já restaurou. O registro de quais cards existem (rota, título, papel mínimo) vive no frontend (`apps/web/src/lib/quick-access.ts`); esta tabela só guarda ids opinativos e ordem, validados contra uma allow-list (`app/modules/workspace_preferences/registry.py`) — nunca decide sozinha o que é permitido (isso é sempre recalculado a partir do papel atual do usuário).
- `organizations.status` (enum Postgres `organization_status`, `active`/`frozen`, migration `0014_organization_lifecycle_logo`, 2026-08-31) — "encerrar um cliente" nunca é `DELETE` (ver [ADR-0008](../adr/0008-organizacoes-nunca-deletar.md)); é sempre uma mudança de status, com `closed_at`/`closed_by`/`closure_reason` preenchidos e limpos por `POST /{id}/freeze` e `/reactivate`. O enum usa `values_callable` explícito no SQLAlchemy (`app/models/organization.py`) para gravar o `.value` minúsculo, não o nome do membro Python — mesma armadilha já documentada em `models/membership.py`, que não é pega por `pytest` (usa `Base.metadata.create_all`, não Alembic) e só aparece rodando `alembic upgrade head` de verdade contra Postgres. `logo_url` (nullable, `String(500)`) guarda a URL do Cloudinary; não há coluna própria para o `public_id` do asset porque ele é determinístico (`lucratix/organizations/<uuid>`), reconstruído quando necessário em vez de armazenado.

## Migrations

- Alembic, uma migration por mudança de schema coerente. Toda migration deve ter `downgrade()` implementado sempre que tecnicamente viável (RNF-013). Migrations que envolvem `baselines`/`audit_logs` nunca adicionam `UPDATE`/`DELETE` a essas tabelas.

## O que este documento não decide ainda

- Particionamento de tabelas de série temporal por data (desnecessário no volume esperado do MVP — reavaliar na Fase 18/Hardening se necessário).
- Criptografia de campo específico (ex.: CNPJ) — ver [data-classification.md](../security/data-classification.md) para classificação de sensibilidade; criptografia de campo fica preparada, não implementada, no MVP.
