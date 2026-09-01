# ADR-0009 — Internacionalização sem prefixo de URL, locale por cookie + coluna no banco

- **Status:** Aceito
- **Data:** 2026-09-01

## Contexto

O prompt mestre pede internacionalização da plataforma em pt-BR/en/es (item 9). A abordagem padrão de bibliotecas de i18n para Next.js App Router (incluindo a própria documentação do Next.js) é reestruturar todas as rotas sob `app/[locale]/...`, com o idioma extraído da URL (`/en/organizations`, `/es/organizations`). O app hoje tem ~24 rotas, quase todas atrás de login.

## Decisão

Usar `next-intl` no modo "sem roteamento i18n": nenhuma rota muda de lugar, o idioma nunca aparece na URL. `src/i18n/request.ts` resolve o idioma no servidor a partir de um cookie (`NEXT_LOCALE`) a cada request — sem `middleware.ts`/`proxy.ts` (Next.js 16 renomeou o primeiro para o segundo; este modo do next-intl não precisa de nenhum dos dois). Persistência em duas camadas: o cookie garante leitura imediata em toda renderização de servidor; uma nova coluna `users.locale` (nullable — `NULL` = nunca escolheu, usa pt-BR) guarda a preferência entre dispositivos, sincronizada por um pequeno componente cliente (`<LocaleSync />`) que compara o cookie atual com o valor salvo ao carregar o app.

## Alternativas consideradas

- **`app/[locale]/*` com prefixo de URL:** é o caminho "padrão" da documentação do Next.js e do próprio next-intl, mas exigiria mover as ~24 rotas existentes (e todo teste/e2e que referencia essas URLs) para dentro de uma nova pasta — uma refatoração de arquivos ampla e de alto risco para um pedido que não menciona URLs multi-idioma em nenhum lugar (`docs/product/`, `docs/requirements/` não têm nenhuma exigência de SEO/rota por idioma). Rejeitado por violar a própria regra do prompt mestre de não fazer refactors não relacionados ao pedido.
- **Só `localStorage`, como o tema claro/escuro:** mais simples, mas o app é fortemente renderizado no servidor (RSC) — o servidor precisaria saber o idioma antes da primeira pintura pra não haver uma renderização inicial sempre no idioma errado seguida de re-render. `localStorage` não é legível no servidor; cookie é. Rejeitado por não funcionar de verdade com SSR.
- **Auto-detecção por `Accept-Language`:** rejeitado por imprevisibilidade — um visitante brasileiro com o navegador em inglês veria a interface em inglês sem pedir, quando o produto é majoritariamente usado em português. Preferência explícita, com padrão fixo em pt-BR, é mais previsível.
- **Sem sincronia entre dispositivos (só cookie, sem coluna no banco):** mais simples de implementar, mas a preferência se perderia a cada novo navegador/dispositivo — pareceu um corte de qualidade perceptível dado o baixo custo de adicionar uma coluna e um endpoint (mesmo padrão já usado por `user_workspace_preferences`, PR de acessos rápidos).

## Consequências

- Nenhuma URL existente muda; nenhum teste/e2e baseado em URL precisou ser reescrito por causa do roteamento.
- `/sobre` (a única rota pública sem nenhuma API dinâmica hoje) perde elegibilidade a geração estática, porque o layout raiz passa a depender de `cookies()` para resolver o idioma — aceito, dado que o app é majoritariamente autenticado e `/` já era dinâmica.
- Trocar de idioma nunca gera uma URL diferente para compartilhar/indexar — se um dia houver exigência real de SEO multi-idioma nas páginas públicas, esta decisão precisará ser revisitada (não é uma porta fechada: o cookie pode conviver com prefixo de URL depois, mas não o contrário sem reescrever rotas).
- Mensagens de erro vindas do backend (`HTTPException(detail=...)`) e e-mails transacionais continuam só em português — não são afetados por esta decisão de roteamento, mas são uma limitação da internacionalização como um todo, documentada em `docs/i18n/README.md`.
