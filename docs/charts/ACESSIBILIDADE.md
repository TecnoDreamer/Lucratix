# Acessibilidade dos gráficos

Disciplina já aplicada a todo gráfico do produto (SVG artesanal ou Recharts), reafirmada e mantida nesta rodada:

- **Gráfico nunca é a única representação da informação.** Todo componente de gráfico tem uma alternativa textual/tabular: `funnel-stages-chart.tsx` e `funnel-evolution-chart.tsx` têm uma tabela `sr-only` (mesmos dados, só para leitor de tela); `stage-conversion-chart.tsx` e `channel-bar-chart.tsx`/tabelas de canal têm a tabela **sempre visível** (dado primário, não só um recurso de acessibilidade) — critério já documentado em `docs/analytics/CHART_DECISIONS.md`.
- **`role="img"` + `aria-label` descritivo** no container do gráfico (nunca só um `<div>` decorativo).
- **Informação nunca depende só de cor** — o destaque do "gargalo"/menor conversão em `StageConversionChart` é redundante com o texto (`bottleneckNote`) e com a própria posição na tabela ordenada, não só a cor âmbar da barra.
- **Contraste e dark mode**: todo elemento de gráfico usa `currentColor`/classes Tailwind (`dark:fill-...`, `dark:stroke-...`) em vez de cor fixa — o tema segue o app, nunca hardcoded.

## O que muda nesta rodada (tooltip)

O tooltip padrão do Recharts (antes desta PR) não tinha nenhum tratamento de contraste/dark mode — `ChartTooltip` (ver [ARQUITETURA_DE_GRAFICOS.md](ARQUITETURA_DE_GRAFICOS.md)) corrige isso com fundo sólido e cores que seguem o tema em ambos os modos. Teclado/toque: o tooltip do Recharts já responde a hover (mouse) e toque (o evento de toque do Recharts dispara o mesmo `activeIndex`); navegação por teclado pura não aciona o tooltip de um gráfico SVG por natureza da biblioteca — a tabela sempre visível/`sr-only` é o caminho de acesso equivalente ao mesmo dado para quem navega só por teclado ou leitor de tela, então nenhuma informação fica inacessível.

`prefers-reduced-motion`: `FunnelChart` já desativava a animação de entrada (`isAnimationActive={false}`); os outros 3 gráficos tocados nesta rodada (`StageConversionChart`, `FunnelEvolutionChart`, `ChannelBarChart`) usavam a animação padrão do Recharts (`react-smooth`, baseada em `requestAnimationFrame`, não CSS) — a regra global `@media (prefers-reduced-motion: reduce)` já existente em `app/globals.css` não alcança esse tipo de animação. Alinhados ao mesmo `isAnimationActive={false}` do funil nesta PR, por consistência (o produto não anima entrada de gráfico em nenhum lugar, então não há uma condição de "reduzir" — já não há o que reduzir).
