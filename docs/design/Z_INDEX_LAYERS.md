# Camadas de empilhamento (z-index)

> Formaliza o esquema de camadas já usado pelo Design System, motivado pelo bugfix do tooltip de métrica (`docs/auditoria/AUDITORIA_BI_RELATORIOS.md`, seção 1). Referência única — qualquer elemento sobreposto novo (dropdown, popover, modal, filtro, preview de PDF) deve escolher sua camada aqui, não inventar um valor ad hoc.

## Regra geral

Um valor de `z-index` só compete de verdade dentro do **stacking context** onde vive. Um elemento com `z-index` alto, mas nascido dentro de um item de `display: grid`/`display: flex` (todo item desses vira seu próprio stacking context, mesmo sem `position`/`transform` explícitos), nunca vai vencer um elemento irmão fora daquele grid — não importa o número. **Qualquer overlay que precise aparecer acima de conteúdo de irmãos de grid/flex (tooltip, popover, dropdown) deve ser renderizado via `createPortal` em `document.body`**, não como filho posicionado dentro do componente que o dispara. É exatamente o que `MetricHelp` (`apps/web/src/components/metric-help.tsx`) faz desde este fix.

## Camadas

| Camada | `z-index` | Uso | Exemplo |
|---|---|---|---|
| `sticky` | `z-10` | Cabeçalhos fixos no topo do scroll, sem sobrepor outros overlays | `apps/web/src/app/conta/layout.tsx` (header da área de conta) |
| `sticky` (topbar) | `z-20` | Barra superior fixa em mobile/tablet, acima do conteúdo da página mas abaixo de drawers/modais | `apps/web/src/app/organizations/[id]/layout.tsx` (topbar com hambúrguer) |
| `overlay` | `z-30` | Fundo escurecido + painel de drawer/modal, acima de qualquer conteúdo de página, abaixo de popover/tooltip | `apps/web/src/app/organizations/[id]/layout.tsx` (drawer de navegação mobile) |
| `popover` / `tooltip` | `z-50` | Conteúdo flutuante portalado em `document.body` — dropdown de filtro, tooltip de métrica, popover de data range | `apps/web/src/components/metric-help.tsx` |
| `toast` | *(reservado, sem uso ainda)* | Notificações temporárias no canto da tela, sempre acima de tudo | — |

`z-40` fica deliberadamente livre entre `overlay` e `popover`/`tooltip` — reservado para um segundo nível de overlay que ainda não existe (ex.: um modal de confirmação aberto por cima de um drawer).

## Ao adicionar um overlay novo

1. Ele precisa aparecer por cima de irmãos de grid/flex (cards, colunas)? Se sim, **portal para `document.body`** — um `z-index` alto sozinho não resolve (ver "Regra geral" acima).
2. Escolha a camada da tabela acima pelo papel do elemento, não por tentativa e erro com números cada vez maiores.
3. Nunca use um valor de `z-index` fora desta tabela sem atualizar este documento.
