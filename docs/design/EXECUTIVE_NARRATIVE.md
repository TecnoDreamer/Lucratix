# Narrativa da Visão Executiva

> Decisões de design da PR `feat/executive-narrative` (continuação do
> redesenho UX/UI — ver [`KPI_HIERARCHY_AND_TONE.md`](KPI_HIERARCHY_AND_TONE.md)
> e [`INSIGHTS_TAXONOMY.md`](INSIGHTS_TAXONOMY.md)). Nenhum dado novo,
> nenhuma chamada de API nova — só a ordem e a moldura das seções que já
> existiam mudaram.

## 1. Por quê

A Visão Executiva mostrava 4 blocos em sequência sem relação narrativa
explícita: KPIs → Insights → Metas/Correlação → Evolução mensal →
Marketing. Cada um fazia sentido isolado, mas a ordem não contava uma
história — "Insights" vinha antes de "Metas"/"Correlação" (o diagnóstico
que sustenta o insight), e não havia nada dizendo "e agora, o que eu
faço com isso".

**Decisão:** reorganizar em 5 estágios (prompt de redesenho UX/UI) + um
6º bloco de drill-down que não é parte da história principal:

1. **Situação atual** — os 7 KPIs do período selecionado (era o topo, continua).
2. **Evolução** — os mesmos 7 KPIs, série mensal (antes vinha depois de
   Metas/Correlação; agora vem logo depois de "onde estamos agora", antes
   de diagnosticar o porquê — "o que aconteceu ao longo do tempo" é
   contexto pro diagnóstico, não uma conclusão dele).
3. **Diagnóstico** — Metas (progresso vs. objetivo) e Correlação (duas
   métricas se movem juntas?), as duas ferramentas que ajudam a entender
   o "porquê" antes da síntese.
4. **Insights** — a taxonomia estruturada (ver `INSIGHTS_TAXONOMY.md`),
   agora posicionada depois do diagnóstico que a sustenta, não antes.
5. **Próxima análise** — novo, fecha a narrativa com uma recomendação e
   atalhos pra continuar a investigação em outra tela.
6. **Marketing** — continua no fim, fora da numeração: é outro domínio
   (canal/campanha), não outro passo da mesma história sobre o negócio
   como um todo.

## 2. Nav de âncoras

Uma lista de 6 pills (`#situation`, `#evolution`, `#diagnosis`,
`#insights`, `#nextAnalysis`, `#marketing`) logo abaixo do filtro de
período, construída a partir de **uma única fonte** (`NARRATIVE_SECTIONS`
em `analytics/page.tsx`) — a ordem da nav e a ordem das `<section>` no
JSX nunca podem divergir porque vêm do mesmo array. Cada `<section>`
ganhou `id` + `scroll-mt-6` (evita o heading ficar colado no topo da
viewport ao navegar pela âncora).

## 3. "Próxima análise" — uma recomendação, não uma repetição

Cada cartão de Insight já termina com seu próprio CTA (`lib/insights.ts`).
"Próxima análise" **não repete todos eles** — escolhe **um**: o primeiro
insight de tom negativo (o que mais precisa de atenção); sem nenhum
negativo, usa o primeiro insight disponível (uma meta batida ainda sugere
uma ação válida — "defina a meta do próximo período"). Sem insight
nenhum, mostra uma frase genérica ("nenhum achado exige atenção
imediata") em vez de esconder a seção.

Além da recomendação, sempre mostra 2 atalhos pras telas de
aprofundamento que **não estão nesta página** — Funil e Financeiro.
Marketing não entra na lista de atalhos por já ser a seção seguinte na
mesma página (`#marketing`, um clique na nav de âncoras já resolve).

## 4. Hierarquia de heading

`TargetsPanel` e `CorrelationPanel` (só usados nesta página) tiveam seu
heading rebaixado de `<h2>` pra `<h3>`, porque agora vivem dentro da
seção "Diagnóstico" (`<h2>`) — hierarquia semântica correta (h2 > h3) em
vez de dois `<h2>` irmãos dentro de uma sub-seção.

## 5. O que não mudou

- Nenhuma chamada de API nova, nenhum cálculo novo — `MetricGrid`,
  `SeriesGrid`, `TargetsPanel`, `CorrelationPanel`, `InsightsPanel` e a
  tabela de Marketing continuam exatamente como eram, só reposicionados.
- `MetricGrid`/`SeriesGrid` continuam sem hierarquia visual
  primário/secundário nesta PR (diferente do Dashboard, que já tem — ver
  `KPI_HIERARCHY_AND_TONE.md` seção 3); o escopo aqui foi a narrativa, não
  a reforma do cartão de KPI. Fechado depois, em `feat/unify-kpi-card`:
  `MetricGrid` passou a usar `KpiCard` (`SeriesGrid` continua de fora —
  motivo na seção 3 daquele doc).
