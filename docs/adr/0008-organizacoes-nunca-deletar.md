# ADR-0008 — Encerramento de empresa-cliente é congelamento (`status`), nunca `DELETE`

- **Status:** Aceito
- **Data:** 2026-08-31

## Contexto

O prompt mestre "Workspace, Configurações, Gestão de Empresas e i18n" exige explicitamente que encerrar
uma relação com um cliente (empresa) **nunca** apague dado histórico — financeiro, marketing, funil,
produtos, experimentos, metas, importações, auditoria. É uma regra de negócio, não só uma preferência
técnica: o histórico de um cliente encerrado continua tendo valor (relatório final, cobrança retroativa,
retomada futura da relação) e apagar uma organização em cascata destruiria tudo isso sem chance de
reversão.

Ao mesmo tempo, era preciso um jeito de "desligar" o acesso de escrita a uma empresa que não é mais
cliente ativo, sem impedir a consulta ao que já existe (RF de "encerrar sem apagar").

## Decisão

`Organization` ganha um campo `status` (enum `active`/`frozen`), nunca uma exclusão. "Congelar"
(`POST /organizations/{id}/freeze`) grava `closed_at`, `closed_by`, `closure_reason` (opcional);
"reativar" (`POST /organizations/{id}/reactivate`) limpa os três — o registro permanente de que isso
aconteceu já vive no audit log (append-only, [ADR-0005](0005-baseline-append-only.md)), então não é
preciso manter um histórico de congelamentos na própria tabela `organizations`.

**Bloqueio de escrita em um único ponto de aplicação:** em vez de adicionar uma checagem de
`status == frozen` em cada um dos ~14 módulos com rotas de escrita com escopo de organização
(financeiro, marketing, funil, produtos, baseline, experimentos, metas, importações, memberships...),
a checagem vive uma única vez em `get_organization_context` (`app/core/deps.py`), a dependency pela qual
**toda** rota com escopo de organização já passa (direto ou via `require_role`) — para isolamento
multi-tenant (RNF-002, [ADR-0003](0003-estrategia-multi-tenancy.md)). Método não-seguro (`POST`/`PATCH`/
`PUT`/`DELETE`) numa organização `frozen` → `409`, antes mesmo de chegar na rota. Leitura (`GET`)
continua liberada em qualquer estado, incluindo deep link direto para a organização congelada — garante
que quem já tinha acesso nunca perde a visão do histórico.

Duas exceções nomeadas e documentadas explicitamente (`get_organization_context_allow_frozen`,
`require_role_allow_frozen`): o próprio par freeze/reactivate (precisa funcionar *sobre* uma organização
já congelada, senão ninguém a reativaria) e `PATCH /workspace-preferences` (preferência pessoal de UI,
não dado da organização — mesma categoria do tema claro/escuro).

## Alternativas consideradas

- **`DELETE` com `ON DELETE CASCADE`:** rejeitado de imediato — é exatamente o resultado que a regra de
  negócio proíbe (perda de histórico financeiro/marketing/auditoria de um cliente).
- **Soft delete genérico (`deleted_at` em toda tabela pertencente à organização):** rejeitado — spalharia
  a mesma regra de "não apagar" por dezenas de tabelas/repositórios já existentes, com risco real de um
  esquecer o filtro `deleted_at IS NULL` (o mesmo tipo de risco que motivou centralizar o isolamento
  multi-tenant em `organization_id`, [ADR-0003](0003-estrategia-multi-tenancy.md)). Um único campo
  `status` na própria organização, combinado com bloqueio de escrita no ponto único já existente, resolve
  o requisito sem tocar em nenhuma outra tabela.
- **Checagem de status duplicada em cada módulo:** rejeitado — múltiplos pontos de aplicação para a mesma
  regra é o padrão de bug mais comum em sistemas multi-tenant (um módulo novo esquece de checar); um único
  ponto, já coberto por teste parametrizado que cobre todo endpoint de escrita conhecido
  (`tests/api/test_organization_lifecycle.py`), é auto-verificável.

## Consequências

- Nenhum módulo de domínio (financeiro, marketing, funil, produtos, baseline, experimentos, metas,
  importações, memberships) precisou de qualquer alteração para respeitar o congelamento — o bloqueio já
  se aplica a todos automaticamente, por transitividade da dependency.
- Um módulo novo que dependa de `get_organization_context`/`require_role` (o caminho padrão de qualquer
  rota nova com escopo de organização) já nasce protegido, sem ação extra do desenvolvedor.
- Concorrência: `freeze`/`reactivate` releem a linha com `SELECT ... FOR UPDATE` antes de checar o
  estado atual, evitando duas chamadas simultâneas duplicarem o efeito ou pisarem em `closed_at`.
- Se uma exceção nova ao bloqueio for necessária no futuro, deve ser nomeada explicitamente
  (`..._allow_frozen`) e justificada no código, nunca um bypass silencioso — mantém a lista de exceções
  pequena e auditável.
