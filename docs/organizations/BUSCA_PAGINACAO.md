# "Suas empresas" escalável — busca e paginação server-side

## O problema

`GET /organizations` devolvia sempre a lista inteira de organizações do usuário, sem filtro nem limite —
funciona com poucas dezenas de empresas, não escala para centenas.

## A API

`GET /api/v1/organizations?search=&status=active|frozen|all&limit=&offset=` →

```json
{ "items": [...], "total": 42, "limit": 24, "offset": 0 }
```

Mesmo formato `{items, total, limit, offset}` já usado em `AuditLogPageRead`/`PreviewPageRead`/
`ImportJobPageRead` — reaproveitado por ser o único contrato de paginação existente no repositório, não
por ser tecnicamente a única opção (uma paginação por cursor teria sido igualmente válida).

- `search` — `ILIKE` parametrizado (nunca concatenado em SQL), termo escapado para `\`, `%` e `_` (nessa
  ordem — a barra invertida primeiro, porque escapar `%`/`_` introduz barras que seriam re-escapadas se a
  ordem fosse invertida) antes de virar `%termo%`. `%`/`_` literais no nome de uma empresa nunca viram
  wildcard sem querer.
- `status` — filtra por `active`/`frozen`/`all` (default `all`).
- `limit`/`offset` — `limit` entre 1 e 100 (default 24), `offset` ≥ 0. Fora da faixa → `422`.
- Ordenação: `(Organization.name, Organization.id)` — o `id` é o desempate necessário; sem ele, duas
  empresas com o mesmo nome podiam trocar de posição entre duas chamadas sequenciais de "carregar mais",
  causando uma linha duplicada e uma pulada.
- Sem índice novo: o filtro por `Membership.user_id` (índice `uq_membership_user_org`, `user_id` líder) já
  restringe o `ILIKE` às organizações de um usuário, não à tabela inteira. `pg_trgm` fica documentado aqui
  como a saída de escape se esse pressuposto deixar de valer em algum momento (usuário com centenas de
  empresas e busca lenta).

`GET /organizations/summary` ganhou `organization_id` repetível (opcional) — a página busca só os
indicadores das organizações que está mostrando, nunca a lista inteira de uma vez.

## Frontend

`apps/web/src/app/organizations/page.tsx` — abas "Ativas | Encerradas | Todas", campo de busca com
debounce (`hooks/use-debounced-value.ts`, 300ms, greenfield — nenhum hook de debounce existia antes),
"Carregar mais" (mesmo padrão já usado no wizard de importação/auditoria, sem scroll infinito).

## Consumidores atualizados na mesma PR

`GET /organizations` deixou de devolver um array puro — 3 outros pontos que liam a resposta direto
precisaram ser atualizados para ler `.items`: `apps/web/src/app/conta/layout.tsx` e dois testes de
integração backend (`tests/api/test_memberships.py`,
`tests/integration/test_multi_tenant_isolation.py`).
