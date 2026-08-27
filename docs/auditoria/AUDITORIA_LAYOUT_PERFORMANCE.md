# Auditoria — Logotipo, Layout e Performance

> Levantamento obrigatório antes de qualquer alteração de código, per `PROMPT_CORRECAO_LAYOUT_LOGO_PERFORMANCE_LUCRATIX.md`. Respostas às 16 perguntas da seção 62 no final deste documento e na resposta ao usuário.

## 1. Problema visual do logotipo — causa raiz

O logotipo oficial da Lucratix é um troféu (crie ver `docs/branding/LUCRATIX_BRAND.md`). Existem dois arquivos de logo em `apps/web/public/brand/`:

| Arquivo | Dimensões reais | Conteúdo |
|---|---|---|
| `lucratix-mark.png` | 1024×1522 (RGBA) | Troféu **completo**: coroa, taça com escudo/seta de crescimento, fitas, coroa de louros, base com a placa "Lucratix" |
| `lucratix-wordmark.png` | 1006×410 (RGBA) | Recorte **só da base** da mesma peça — mas o recorte foi feito de forma descuidada e captura, na borda superior do quadro, uma fatia truncada da taça/haste do troféu |

**Causa raiz confirmada visualmente**: o `lucratix-wordmark.png` não é um wordmark limpo — é um crop do `lucratix-mark.png` que corta o troféu no meio de uma forma (a haste dourada da taça), deixando um fragmento anguloso na borda superior da imagem. É exatamente esse fragmento que aparece como "logo cortado/quebrado" no topo do painel de autenticação (visível na screenshot enviada pelo usuário como estado atual).

`apps/web/src/components/brand-logo.tsx` já implementa as duas variantes (`variant="mark"` = troféu completo, `variant="wordmark"` = o recorte problemático) — **mas nenhum dos 6 pontos de uso no código chama `variant="mark"`**. O troféu completo, correto, já existe como arquivo — só nunca é renderizado:

```
apps/web/src/app/login/page.tsx:59           variant="wordmark" (mobile, h-16)
apps/web/src/app/register/page.tsx:52        variant="wordmark" (mobile, h-16)
apps/web/src/app/esqueci-senha/page.tsx:46   variant="wordmark" (mobile, h-16)
apps/web/src/app/redefinir-senha/page.tsx:61 variant="wordmark" (mobile, h-16)
apps/web/src/app/page.tsx:52                 variant="wordmark" (h-10)
apps/web/src/components/auth-hero.tsx:49     variant="wordmark" (desktop, h-9)
```

Ou seja: o mesmo recorte truncado aparece em toda tela de autenticação, em desktop e mobile — não é um bug de CSS/container, é o **arquivo de origem do wordmark** que está incorreto.

## 2. Comparação `image.png` (atual) × `3.jpg` (referência)

O usuário anexou os dois estados como screenshots na conversa (não como arquivos no repositório):

- **Atual**: logo pequeno (~36-64px de altura) no canto superior esquerdo do painel de marca, mostrando o fragmento truncado descrito acima — ilegível como troféu, parece um erro de recorte.
- **Referência**: o troféu completo (`lucratix-mark.png`, já existe no repo) exibido em tamanho grande, com destaque visual, na composição da tela de login — exatamente a peça que já está no repositório mas nunca é usada.

## 3. Container/CSS — não é a causa

Investigação de `object-fit`, `overflow`, `width`/`height` fixos, `transform`, breakpoints: `apps/web/src/components/brand-logo.tsx` usa `next/image` com `width`/`height` explícitos batendo com as dimensões reais do arquivo (sem distorção de aspect ratio) e as classes de uso (`h-9 w-auto`, `h-16 w-auto`, `h-10 w-auto`) usam `object-fit` implícito do `next/image` (`contain` por padrão quando `width`/`height` são passados, não `fill`) — não há `overflow: hidden` cortando o logo em nenhum container pai (`auth-hero.tsx`, `login/page.tsx` etc. não têm `overflow-hidden` no elemento que envolve o logo). **O corte está no pixel do arquivo, não no CSS.**

## 4. Performance — medições reais (não estimativa)

Medido via `PerformanceObserver`/Resource Timing API contra o deploy Vercel de produção (`marketing-intelligence-platform-umber.vercel.app/login`), não só leitura de código:

| Recurso | Tamanho transferido | Duração |
|---|---|---|
| `image?url=%2Fbrand%2Flucratix-wordmark.png&w=1080&q=75` | **58.680 bytes (~57 KB)** | **584 ms** |
| `image?url=%2Fbrand%2Flucratix-wordmark.png&w=2048&q=75` (preload) | 300 bytes | 48 ms |
| Total de todos os recursos da página | ~280 KB | — |

**Achado concreto**: o logo renderiza a **no máximo 64px de altura** (`h-16`) em qualquer breakpoint, mas o `next/image` está servindo uma imagem de **1080px de largura** — porque `BrandLogo` (`brand-logo.tsx:32-39`) passa `width`/`height` iguais à resolução **total do arquivo de origem** (1006×410) para o componente `Image`, sem um prop `sizes` dizendo ao Next.js qual é o tamanho real exibido em cada breakpoint. Sem `sizes`, o Next.js gera candidatos de `srcset` mirando a largura declarada (1006px), não a largura CSS renderizada (~90-157px) — resultando em servir uma imagem ~7-12× maior que o necessário. Isso é responsável por boa parte do tempo do maior recurso da página de login, numa imagem marcada `priority` (ou seja, candidata a LCP).

**LCP/CLS não medidos com precisão nesta auditoria**: o Performance Paint Timing API não retornou entradas no navegador de teste usado (limitação do ambiente de auditoria, não do site) — não estimamos esses números sem medição real (princípio do prompt, seção 48: "Não otimize apenas por sensação. Meça."). Recomenda-se rodar Lighthouse manualmente contra a URL de produção antes/depois da correção para números oficiais.

Achados adicionais de código (sem servidor rodando, revisão estática + 1 agente de exploração dedicado):

- **Sem waterfalls de rede**: toda página com 2+ chamadas independentes já usa `Promise.all` (`analytics/page.tsx:128-144`, `dashboard/page.tsx:40-43`, `marketing/page.tsx:24-27`, `reports/page.tsx:88-98`, `organizations/page.tsx:26-29`) — nenhuma correção necessária aqui.
- **Sem requests duplicadas**: todo componente de fetch segue o padrão `let cancelled = false` (13 arquivos verificados). Única exceção: `organizations/page.tsx` não usa a flag — risco baixo (dependência de efeito estável), não urgente.
- **Bundle já é enxuto**: `apps/web/package.json` só tem `next`, `react`, `react-dom` como dependência de produção — nenhuma lib de gráfico, animação, data ou ícone (ícones são componentes SVG próprios). **Bundle JS não é o gargalo desta aplicação.**
- **Zero `<img>` cru**: só `next/image`, via `BrandLogo`. Nenhum achado de imagem não otimizada fora do problema de `sizes` acima.
- **`priority` usado em duas imagens simultâneas por página** nas telas de auth: o `AuthHero` (desktop, `lg:flex`) e o logo mobile duplicado (`lg:hidden`) estão os dois no DOM ao mesmo tempo, os dois com `priority` — só um é visível por vez (CSS breakpoint), mas os dois são pré-carregados como críticos.
- **Fontes já otimizadas**: `next/font/google` (Geist + Geist Mono), variable fonts, self-hosted — nenhuma mudança necessária.
- **`/` (raiz) é Client Component fazendo round-trip antes de redirecionar**: `apps/web/src/app/page.tsx` é `"use client"`, faz `useEffect` → `api.get("/auth/me")` → só então decide `router.replace("/organizations")` ou `/login`. Isso significa: toda visita à raiz do domínio baixa o bundle JS, hidrata, e só DEPOIS faz uma chamada de rede para decidir para onde ir — um roundtrip render-then-fetch-then-redirect evitável. Poderia virar Server Component lendo o cookie via `next/headers` e redirecionando no servidor, sem JS de cliente nem tela intermediária.
- **Sem lazy loading/code splitting manual** (`next/dynamic`/`React.lazy`): zero ocorrências. Não é urgente hoje (não há componente pesado tipo gráfico ou embed do Power BI ainda), mas é o padrão a estabelecer **antes** de qualquer integração futura do Power BI (seção 26 do prompt: nunca carregar Power BI fora da aba correspondente).
- **Sem debounce em filtros de data/mês**: `date-range-filter.tsx`, `dashboard/page.tsx` (`type="month"`) e `reports/page.tsx` disparam refetch imediato a cada mudança — como são `<input type="date">`/`type="month"` (não texto livre), o navegador não dispara por tecla, então o risco real é baixo; incluído aqui só por completude.
- **Backend**: `organization_id` já tem índice explícito em toda tabela relevante (migrations `ix_<tabela>_organization_id`) — não é um gargalo. Nenhum padrão N+1 encontrado nas camadas de repository/service (agregações operam sobre listas já carregadas, sem query por item).

## 5. Plano de implementação (proposto, ver perguntas 1-16 na resposta ao usuário)

1. Corrigir o arquivo de origem do wordmark (recorte limpo, sem fatia da taça) **ou** substituir os pontos de uso do wordmark pelo `variant="mark"` (troféu completo) onde fizer sentido — decisão de composição a confirmar com o usuário (ver pergunta 5).
2. Nova composição do painel de autenticação (`auth-hero.tsx`) dando mais presença ao troféu, inspirada em `3.jpg`.
3. Efeito de rotação 360° discreto (entrada + hover), respeitando `prefers-reduced-motion`.
4. Adicionar `sizes` ao `next/image` do `BrandLogo` para eliminar o over-fetch de 57KB medido.
5. Revisar duplo `priority` nas telas de auth (só a imagem realmente visível no breakpoint deveria ser `priority`).
6. Converter `/` (raiz) em Server Component com redirect server-side.
7. Documentar em `docs/design/DESIGN_SYSTEM.md` e `docs/performance/`.

## Riscos

- Qualquer mudança no wordmark/mark afeta 6 pontos de uso simultaneamente — precisa de verificação visual em todos (desktop/mobile) antes de mergear.
- Efeito de rotação 360° é o item com maior chance de ficar "gamer demais" se mal calibrado — a Lucratix pede estética fintech/BI/SaaS premium, não gaming.
- Sem Lighthouse real rodado ainda (só Resource Timing) — números de LCP/CLS "antes" formais ficam pendentes de uma medição dedicada antes do PR de performance.

## 6. Follow-up (2026-08-27) — logo mobile ainda usava o recorte, não o troféu completo

O item 1 do plano acima ("substituir os pontos de uso do wordmark pelo `mark`") foi feito só para o painel de marca desktop (`auth-hero.tsx`, PR #69) — o logo mobile duplicado (`lg:hidden` nas 4 telas de auth) continuou em `variant="wordmark"`. Como o crop já tinha sido corrigido (PR #68, sem mais a fatia truncada da haste), isso não era mais um bug de CSS — mas o usuário ainda via só a base do troféu no mobile (sem coroa/taça/fitas), o que lia como "logo incompleto".

**Causa raiz**: escolha de asset, não container/CSS. Confirmado ponto a ponto (seção 25 do novo prompt de responsividade): sem `overflow-hidden`, sem `object-fit` incorreto, sem tamanho fixo incompatível — só `variant="wordmark"` onde deveria ser `variant="mark"`.

**Correção**: `variant="mark"` nas 4 telas, com `w-auto h-auto max-w-[120px] object-contain sm:max-w-[150px]` (largura responsiva, não altura fixa — a proporção do `mark` é retrato, diferente do `wordmark`, que é paisagem). Verificado sem overflow horizontal em 320/375/750/1440px e sem regressão no desktop (`AuthHero` intocado, `display:none`/`block` corretos em cada breakpoint via `getComputedStyle`, já que `getBoundingClientRect` não é confiável nesta sessão em abas em segundo plano — ver limitação já registrada no início desta auditoria).
