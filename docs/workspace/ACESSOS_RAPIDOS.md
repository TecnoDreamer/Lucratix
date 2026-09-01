# Acessos rápidos configuráveis

Os cards de "Acesso rápido" da Home (Analytics, Financeiro, Marketing, Funil, Produtos, Experimentos, Central de Dados) eram uma lista fixa, igual para todo mundo. Agora cada usuário escolhe quais aparecem e em qual ordem, por empresa.

## Modelo de dados

Tabela `user_workspace_preferences` (migration `0013_user_workspace_preferences`): uma linha por `(user_id, organization_id)`, coluna `quick_access` (JSONB) com um array ordenado `[{"id": "analytics", "enabled": true}, ...]`.

`quick_access` é **nullable de propósito**:
- `NULL` = "usuário nunca configurou, usar o padrão".
- `[]` = "usuário desativou todos os cards".

São estados diferentes. "Restaurar padrão" grava `NULL`, não a lista padrão atual — assim, se uma versão futura adicionar um card novo, ele aparece automaticamente para quem já restaurou (não fica escondido por uma lista congelada no momento da restauração).

## Onde vive o registro de cards

**No frontend**, `apps/web/src/lib/quick-access.ts` — id, rota, título, descrição, ícone e papel mínimo de cada card. O backend (`app/modules/workspace_preferences/registry.py`) só guarda uma allow-list dos ids válidos, para rejeitar (422) um payload com id desconhecido.

Motivo: "disponível" depende de duas coisas que já são fatos do frontend hoje — a rota existir e o RBAC do papel atual permitir. Mover o registro para o backend duplicaria essa fonte da verdade sem ganho de segurança real.

**Ao adicionar um card novo**, atualize as duas listas:
1. `apps/web/src/lib/quick-access.ts::QUICK_ACCESS_CARDS`
2. `apps/api/app/modules/workspace_preferences/registry.py::QUICK_ACCESS_CARD_IDS`

## Regra estrutural (não apenas validação de entrada)

**Uma preferência salva nunca "ressuscita" um card que o papel atual do usuário não permite.** Isso não é reforçado só na escrita — é garantido pela própria forma como a leitura funciona: `resolveQuickAccess(role, preference)` primeiro calcula o universo de cards permitidos pelo papel **atual** (recalculado a cada render, nunca cacheado), e só then usa a preferência salva para ordenar/filtrar dentro desse conjunto. Um id salvo que não está mais no conjunto permitido (papel rebaixado, card retirado, ou um payload malicioso) é descartado silenciosamente — nunca reintroduzido.

Testado explicitamente em `apps/web/src/lib/quick-access.spec.ts` e em `apps/web/src/app/organizations/[id]/page.spec.tsx` ("VIEWER + preferência não pode ressuscitar Analytics").

## API

`GET/PATCH /api/v1/organizations/{id}/workspace-preferences` (`apps/api/app/modules/workspace_preferences/`):

- **Sem `require_role`** — é uma preferência pessoal de UI (não dado da organização), mesma categoria do tema claro/escuro. Qualquer membership ativa, inclusive VIEWER, pode ler e escrever a própria preferência.
- **Sem `record_audit`** — reordenar cards não tem valor de auditoria/compliance; incluir aqui poluiria a trilha lida por admins em `/organizations/{id}/audit`.
- `GET` nunca retorna 404 por ausência de linha — devolve `quick_access: null`.
- `PATCH` com `quick_access: null` explícito = "restaurar padrão" (grava NULL). Campo ausente do corpo = sem alteração nenhuma.

## Interação (acessibilidade)

Reordenação por botões "mover para cima/para baixo", não drag-and-drop — requisito explícito de acessibilidade por teclado. Cada `<li>` é chaveado pelo id do card, então o React move o próprio nó do DOM ao reordenar (o foco do teclado acompanha o item movido automaticamente, sem refoco manual).
