# Ciclo de vida de uma organização — congelar / reativar

Ver a decisão completa em [ADR-0008](../adr/0008-organizacoes-nunca-deletar.md). Este documento cobre o
"como", não o "por quê".

## Estados

`Organization.status`: `active` (padrão) ou `frozen`. Ao congelar, gravam-se `closed_at` (timestamp),
`closed_by` (usuário que congelou) e `closure_reason` (opcional, até 500 caracteres); ao reativar, os três
são limpos — o registro permanente de que isso aconteceu (quem, quando, por quê) já vive no audit log
(`organization.frozen`/`organization.reactivated`, append-only).

## Endpoints

- `POST /api/v1/organizations/{id}/freeze` — `{ "reason": "opcional" }`. `ORGANIZATION_ADMIN`+. `409` se
  já estiver congelada.
- `POST /api/v1/organizations/{id}/reactivate` — sem corpo. `ORGANIZATION_ADMIN`+. `409` se já estiver
  ativa.

Ambos releem a linha com `SELECT ... FOR UPDATE` (`app/modules/organizations/service.py`) antes de checar
o estado atual — evita que dois cliques simultâneos (dois admins, ou um duplo-clique) apliquem o efeito
duas vezes ou sobrescrevam `closed_at`/`closed_by` um do outro.

## Bloqueio de escrita — um único ponto de aplicação

`app/core/deps.py::get_organization_context` — a dependency pela qual **toda** rota com escopo de
organização já passa (direto ou via `require_role`), para isolamento multi-tenant (RNF-002) — passou a
checar, para método não-seguro (`POST`/`PATCH`/`PUT`/`DELETE`) numa organização `frozen`: `409`. Nenhum
módulo de domínio (financeiro, marketing, funil, produtos, baseline, experimentos, metas, importações,
memberships) precisou de alteração — o bloqueio já se aplica a todos por transitividade.

`GET` nunca é bloqueado, em nenhum estado — inclui `GET /{id}` diretamente, garantindo que um deep link
para uma empresa encerrada nunca vira 404 para quem ainda tem acesso a ela.

**Duas exceções nomeadas** (`get_organization_context_allow_frozen` / `require_role_allow_frozen`):

1. Os próprios `freeze`/`reactivate` — precisam funcionar *sobre* uma organização já congelada.
2. `PATCH /organizations/{id}/workspace-preferences` — preferência pessoal de UI (mesma categoria do tema
   claro/escuro), não dado da organização.

Qualquer exceção nova precisa ser nomeada e justificada da mesma forma — nunca um bypass silencioso.

## Frontend

- Banner não-bloqueante em toda sub-página da organização quando congelada
  (`app/organizations/[id]/layout.tsx` → `components/frozen-organization-banner.tsx`).
- "Ações rápidas" escondidas na Home quando a organização está congelada.
- Seção "Ciclo de vida" na nova tela `app/organizations/[id]/configuracoes/page.tsx`: congelar (via
  `components/confirm-dialog.tsx` — greenfield, nenhum modal reaproveitável existia antes desta PR — com
  campo opcional de motivo) e reativar.
- "Encerrada" aparece como badge no card da lista (`components/company-card.tsx`).

## Teste mais importante desta PR

`tests/api/test_organization_lifecycle.py` — um caso parametrizado por **todo** endpoint de escrita
conhecido com escopo de organização (financeiro, funil, produtos, baseline, marketing, campanhas,
experimentos, metas, importações, memberships, a própria organização, logo), confirmando `409` numa
empresa congelada. Se um módulo futuro esquecer de passar por `get_organization_context`, este teste
falha. Cobre também: leitura continua `200` congelada, nenhum dado é apagado ao congelar, reativar limpa
os campos e destrava escrita, papel insuficiente → `403`, congelar duas vezes → `409`.
