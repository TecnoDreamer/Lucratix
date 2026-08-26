# Design System — Lucratix

> Complementa `docs/design/Z_INDEX_LAYERS.md` (camadas de sobreposição). Este documento cobre cor/tokens; tipografia, espaçamento e componentes seguem os padrões já estabelecidos em `apps/web/src/lib/ui.ts` e `apps/web/src/components/ui.tsx`, não duplicados aqui.

## Tokens de cor

Definidos como CSS custom properties em `apps/web/src/app/globals.css`, mapeados para o Tailwind v4 via `@theme inline` (uso: `bg-brand-primary`, `text-text-secondary`, `border-border`, etc. — ou `var(--brand-primary)` em CSS/inline style quando a classe utilitária não cobrir o caso, como gradientes com posições de stop customizadas).

| Token | Papel |
|---|---|
| `--brand-primary` | Cor de ação primária da marca (botões, links, foco) — ver `docs/branding/LUCRATIX_BRAND.md` para origem |
| `--brand-secondary` | Azul navy profundo — fundos/gradientes de marca (painel de auth, cabeçalhos institucionais) |
| `--brand-accent` | Dourado — uso pontual, nunca como cor de ação primária |
| `--brand-glow` | Dourado luminoso — efeitos de brilho/blur decorativos, sempre discretos |
| `--background` / `--background-subtle` | Fundo de página / fundo de seções levemente distintas |
| `--surface` / `--surface-elevated` | Fundo de card / fundo de elemento elevado (modal, popover) |
| `--text-primary` / `--text-secondary` / `--text-muted` | Hierarquia de texto |
| `--border` / `--border-hover` | Bordas em repouso / em hover |
| `--focus` | Cor do anel de foco visível (acessibilidade) |
| `--success` / `--warning` / `--error` / `--info` | Cores de estado |

Todos os tokens têm variante clara (`:root`) e escura (`:root.dark`) — ver `globals.css`.

## Escopo desta formalização

Estes tokens foram introduzidos para os novos componentes de marca (`BrandLogo`, `AuthHero` evoluído) e para orientar o próximo trabalho (redesign de autenticação, área de Analytics). **As páginas e componentes já existentes continuam usando classes Tailwind diretas** (`bg-blue-600`, `text-slate-500`, etc., em `apps/web/src/lib/ui.ts` e nas páginas) — não foi feita uma migração retroativa em massa, por ser um refactor largo e de baixo valor imediato sobre código estável (contexto do prompt: "não reescreva desnecessariamente"). Os valores escolhidos para os novos tokens são consistentes com a paleta azul/slate já em uso, então não há conflito visual entre código novo e antigo.

Ao criar um componente novo, prefira os tokens semânticos (`--text-primary` em vez de `slate-900` direto) — isso os torna a fonte única quando/se uma migração futura for decidida.

## Movimento e acessibilidade

Toda animação (`animate-fade-in-up`, `animate-float`, etc., definidas em `globals.css`) respeita `prefers-reduced-motion: reduce` globalmente — reduzida a praticamente zero para quem ativou essa preferência do sistema operacional (regra adicionada nesta rodada; antes não existia).
