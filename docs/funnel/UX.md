# UX — Análise do Funil, Glossário completo, gráficos

## Estrutura da tela

`organizations/[id]/funnel/page.tsx` ganhou uma seção "Análise do
Funil" acima da tabela de lançamento manual (que continua exatamente
como era — nenhuma mudança no fluxo de entrada de dado):

- `DateRangeFilter` (reutilizado de Analytics) escolhe o intervalo.
- `SegmentedControl` "Agregado" / "Por canal" — só essas duas opções.
  Fonte/Plataforma **não** são oferecidas como segmentação: não são
  campos modelados neste sistema hoje (ver `docs/funnel/MODELAGEM.md`
  e os verbetes de Glossário de Fonte/Plataforma). Oferecer um filtro
  que não teria nenhum dado por trás seria pior do que não oferecer.
- **Agregado**: cards das 8 etapas, `FunnelStagesChart` (visualização
  em funil), `StageConversionChart` (conversão/abandono etapa-a-etapa
  + gargalo), `InsightsPanel`, `FunnelEvolutionChart` (evolução
  temporal de uma etapa por vez, com seletor).
- **Por canal**: `FunnelByChannelTable` — busca sob demanda (só na
  primeira vez que o toggle é usado), invalidada sempre que o período
  muda. Sem comparação de período (eixo é canal A vs. canal B).

## O ícone `?` já existia

`components/metric-help.tsx` (`MetricHelp`) já era exatamente o
componente reutilizável que o prompt original pedia — funciona por
hover (desktop), foco (teclado) e toque (mobile), nunca só hover, e já
linka pro Glossário com deep-link (`?metric=<id>`, auto-expande e
destaca o verbete). Não foi criado nada novo aqui: os 13 verbetes
novos só precisaram de `<MetricHelp metric="..." />` ao lado de cada
termo referenciado na tela. A única mudança necessária no componente
foi condicionar a linha "↑/↑ é melhor" à existência de `direction`
(verbete categórico não tem).

## Recharts — primeira exceção ao padrão SVG-artesanal

`docs/analytics/CHART_DECISIONS.md` documentava SVG à mão como padrão
vigente. O Funil é a primeira exceção, decidida com o usuário na PR1:
o gráfico de funil (formas trapezoidais decrescentes) não tem um
equivalente hand-rolled que valha a pena construir do zero, e o
`FunnelChart` do Recharts já resolve isso nativamente. Uma vez que a
dependência entrou, os outros 2 gráficos novos (`StageConversionChart`,
`FunnelEvolutionChart`) também usam Recharts, para não misturar dois
motores de gráfico na mesma tela.

Todos os 3 seguem a mesma disciplina de acessibilidade que os gráficos
SVG artesanais já tinham: `role="img"` + `aria-label`, e uma tabela com
os mesmos dados (`sr-only` na visualização em funil e na evolução
temporal; **sempre visível** na conversão por etapa, que é dado
primário, não só um complemento visual — mesmo critério de
`MarketingByChannelTable`).

## Gargalo e insights

Client-side, determinístico, sem linguagem causal — ver
`docs/funnel/KPIS.md`.
