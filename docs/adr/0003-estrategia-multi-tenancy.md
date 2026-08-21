# ADR-0003 — Multi-tenancy: banco e schema compartilhados, isolamento por `organization_id`

- **Status:** Aceito
- **Data:** 2026-08-21

## Contexto

RNF-002 exige que nenhum usuário acesse dado de organização à qual não pertence. Este é o requisito de segurança mais crítico do produto ([risks.md](../product/risks.md), [threat-model.md](../security/threat-model.md)).

## Decisão

Usar um único banco PostgreSQL e um único schema, com coluna `organization_id` obrigatória em toda tabela pertencente a uma organização, e filtro por essa coluna centralizado na camada de repositório (não deixado a cargo de cada rota individualmente).

## Alternativas consideradas

- **Schema por tenant (schema-per-tenant):** isolamento mais forte a nível de banco, mas complica migrations (rodar em N schemas), backup/restore e connection pooling; overkill para o volume esperado do MVP (uma consultoria, dezenas de empresas-cliente).
- **Banco por tenant (database-per-tenant):** isolamento máximo, mas custo operacional alto (provisionamento, migrations, monitoramento por banco) — não se justifica neste estágio; poderia ser revisitado se exigência contratual/regulatória de um cliente específico exigir isolamento físico total.
- **Filtro de tenant só na aplicação, sem padronização:** rejeitado — alto risco de um endpoint esquecer o filtro (causa mais comum de vazamento entre tenants em sistemas multi-tenant reais).

## Consequências

- Mais simples de operar (uma migration, um banco, um pool de conexão) no MVP.
- Exige disciplina de engenharia: **todo** repositório de entidade com `organization_id` deve aplicar o filtro; será validado por teste de integração automatizado específico (Fase 7) que tenta acesso cruzado entre organizações e espera falha.
- Migração futura para isolamento mais forte (schema ou banco por tenant) permanece possível, pois `organization_id` já existe como fronteira lógica em todo o modelo — não é uma decisão que "tranca" o produto.
