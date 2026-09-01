# Navegação: Configurações → Home da empresa ativa

## O bug

`apps/web/src/app/conta/layout.tsx` tinha um `<Link href="/organizations">` fixo como único "Voltar" das páginas de conta — sempre ia para "Suas empresas", nunca para a empresa que o usuário estava usando, porque essa rota (`/conta/configuracoes`) não é aninhada em `/organizations/[id]` e não tinha nenhum acesso a um id de organização.

## O mecanismo (3 camadas, nunca `router.back()`)

`router.back()` foi descartado de propósito: o histórico do navegador pode conter um deep link, um refresh ou uma página externa — não é confiável para decidir "de onde a pessoa veio".

1. **Escrita** — o único link real para `/conta/configuracoes` no app é a sidebar (`apps/web/src/app/organizations/[id]/layout.tsx`), que agora inclui `?from=<orgId>`. No mesmo arquivo, ao carregar a organização com sucesso, o id é lembrado em `localStorage` (`rememberActiveOrganizationId`, só na branch de sucesso — nunca em 404/erro).
2. **Leitura** — `apps/web/src/lib/active-organization.ts::resolveActiveOrganization(organizations, fromParam)`: valida `fromParam` como UUID, procura na lista **real** de organizações do usuário (`GET /api/v1/organizations`, já filtrada por membership no backend); se ausente/inválido, cai para o id lembrado em `localStorage`; se nada bater, `null`.
3. **Fallback** — `accountBackTarget(null)` sempre resolve para `/organizations` + rótulo "Suas empresas".

## Segurança (evita open redirect / cross-tenant leak)

`fromParam` **nunca** vira `href` diretamente — é só uma chave de busca dentro da lista de organizações do próprio usuário. Um id que ele não pertence nunca aparece nessa lista, então nunca é renderizado nem linkado. Por esse mesmo motivo, o backend nunca é consultado com `fromParam` cru (`GET /organizations/{fromParam}`) — isso criaria um oráculo de existência de organização para quem não tem acesso a ela.

## Os 6 cenários exigidos

| Cenário | Resolução |
|---|---|
| Botão visual "Voltar" | `?from=<orgId>` (escrito pela sidebar) |
| Browser Back nativo | Não mexido — `next/link` já empilha histórico normalmente |
| Sidebar | É a própria escrita (`?from=`) |
| Deep link sem `?from` | Cai no id lembrado em `localStorage` |
| Refresh | Querystring sobrevive a um reload |
| Sessão expirada/membership revogada | `GET /organizations` volta vazio/401 → `activeOrganization = null` → fallback "Suas empresas" (que por sua vez já redireciona pro login quando necessário — sem duplicar essa lógica aqui) |

## Arquivos

- `apps/web/src/lib/active-organization.ts` — lógica pura, testada em `active-organization.spec.ts`.
- `apps/web/src/contexts/account-context.tsx` — compartilha a lista de organizações (buscada uma vez pelo layout) com a seção "Acessos rápidos" de Configurações, sem segunda chamada.
- `apps/web/src/app/conta/layout.tsx` — busca `GET /api/v1/organizations`, resolve o alvo do "Voltar".
- `apps/web/src/app/organizations/[id]/layout.tsx` — escreve `?from=` e `localStorage`.
