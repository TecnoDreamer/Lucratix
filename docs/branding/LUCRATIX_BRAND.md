# Marca — Lucratix

## Nome

**Lucratix.** Nome oficial do produto a partir de 2026-08-26 (antes, a aplicação não tinha nome próprio — só a tagline "Marketing Analytics, Growth & BI Platform", usada como placeholder; ver `docs/product/vision.md`). O nome do repositório (`marketing-intelligence-platform`) e os nomes de pacote (`web`, `api`) permanecem inalterados — são infraestrutura, não marca (ver seção 3 do prompt de rebranding).

## Logo

Fonte: fornecido pelo usuário na raiz do repositório (`logo.png`) e movido para `apps/web/public/brand/logo-source.png` (arquitetura do Next.js exige assets estáticos em `public/`; ver seção 5 do prompt de rebranding). 1024×1536px, RGBA com transparência real (confirmado por amostragem de pixel — o fundo é genuinamente transparente, não uma vinheta escura opaca). Ilustração 3D de um troféu com escudo (gráfico de crescimento), coroa, fitas e grinalda, com a palavra "Lucratix" na base. Os dois recortes usados pela aplicação (tabela abaixo) foram derivados deste arquivo-fonte.

**Limitação conhecida e documentada** (seção 49 do prompt): a peça é ornamentada e em formato retrato — não se sustenta em tamanhos pequenos (favicon, ícone de header). Por isso, três derivações:

| Asset | Arquivo | Uso |
|---|---|---|
| Logo completo | `apps/web/public/brand/lucratix-mark.png` (1024×1522, aparado do padding transparente) | Lugares grandes: painel de marca do login/cadastro, loading institucional |
| Wordmark | `apps/web/public/brand/lucratix-wordmark.png` (1006×410, recorte só da placa "Lucratix" na base) | Header, sidebar, card de login/cadastro — mais legível em proporções estreitas |
| Favicon/ícone | `apps/web/src/app/icon.tsx`, `apple-icon.tsx` (gerados por código, não recortados do logo) | Aba do navegador, tela inicial iOS — "L" estilizado nas cores de marca, único jeito de manter legibilidade em 32×180px |

Componente de uso: `apps/web/src/components/brand-logo.tsx` (`<BrandLogo variant="mark" | "wordmark" />`), sempre via `next/image` (otimização automática de tamanho/formato — a fonte é ~2MB, não deve ser servida crua).

### Uso em fundo claro / fundo escuro

O logo tem transparência real e funciona nos dois. O wordmark tem uma placa de fundo azul-marinho escura própria — funciona melhor sobre fundos claros ou sobre o gradiente de marca (`--brand-secondary`/`--brand-primary`); sobre um fundo já muito escuro (ex.: `--background` do tema dark, `#020617`), o contraste da placa com o fundo diminui — nesses casos, prefira colocá-lo dentro de um cartão/painel com o próprio gradiente de marca por trás (como no `AuthHero`), não direto sobre o body.

## Paleta

Extraída por amostragem real de pixels de `logo.png` (histograma de cores dominantes), não escolhida livremente:

| Token | Valor (claro) | Valor (escuro) | Origem |
|---|---|---|---|
| `--brand-primary` | `#0052e0` | `#3b82f6` | Azul royal do escudo do troféu |
| `--brand-secondary` | `#001640` | `#0a1436` | Azul navy profundo do fundo/base |
| `--brand-accent` | `#f0a800` | `#f0a800` | Dourado da coroa/moldura/grinalda |
| `--brand-glow` | `#ffce54` | `#ffce54` | Dourado luminoso (realces/brilho da imagem) |

Ver todos os tokens (incluindo texto, superfície, bordas e cores de estado) em `apps/web/src/app/globals.css` e `docs/design/DESIGN_SYSTEM.md`.

## Tipografia

Sem mudança — o app já usa Geist Sans (UI) e Geist Mono (dados tabulares/código), via `next/font`. O logo tem sua própria tipografia embutida na ilustração (não é uma fonte do sistema, não deve ser extraída/reutilizada em texto).

## Tom de comunicação

Direto, orientado a dado e decisão — nunca institucional/genérico. Evitar linguagem de "sistema"/"plataforma"/"dashboard" como se fosse o nome do produto; usar "Lucratix" como nome próprio. Não inventar alegações de segurança (ver `docs/security/AUTHENTICATION.md`) nem usar termos técnicos (JWT, SSL) como selo de confiança.

## Regras de aplicação

- Nunca deformar/esticar o logo (usar `next/image` com `width`/`height` corretos preserva a proporção).
- Não repetir o logo completo (`variant="mark"`) mais de uma vez por tela — é uma peça grande, pensada para um único momento de destaque.
- `--brand-accent` (dourado) é para uso pontual (badges, glow, realces) — a cor de ação primária do produto (botões, links) continua `--brand-primary` (azul), consistente com o que já existe em todo o app.
