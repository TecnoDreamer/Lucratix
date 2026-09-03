# KPIs — conversão e abandono etapa-a-etapa

## As 8 etapas (ordem fixa, RN-006)

`impressions → visits → leads → mqls → sqls → opportunities → customers → repeat_purchases`

Mesma ordem de `app/models/funnel_snapshot.py` e de `FUNNEL_STAGES`
(`app/modules/analytics/funnel_analytics.py`) — usada em todo lugar que
itera as etapas, para nunca haver duas ordens divergentes no código.

## As 7 conversões/abandonos (pares consecutivos)

Para cada par consecutivo (`STAGE_TRANSITIONS`), duas métricas:

- **Taxa de conversão** = etapa seguinte / etapa atual — reaproveita
  `engine.conversion_rate` (já existente, usado hoje só para
  Lead→Cliente no dashboard), sem fórmula nova. Segue o mesmo contrato
  do motor de métricas: dado ausente ou base zero nunca vira 0, sempre
  `is_applicable=False`.
- **Taxa de abandono** = 1 − taxa de conversão da mesma etapa. Nunca um
  cálculo independente: quando a conversão não é aplicável (dado
  ausente ou base zero), o abandono herda a mesma razão — nunca
  `1 - None`. É o único verbete de Glossário desta PR ("Taxa de
  Abandono", `apps/web/src/domain/metrics/metric-definitions.ts`).

Exemplo: 500 leads, 300 MQLs → conversão Lead→MQL = 60%, abandono dessa
etapa = 40%.

## "Maior gargalo" e insights (PR2, client-side)

`findBottleneck`/`computeFunnelInsights` (`apps/web/src/lib/funnel-insights.ts`)
— a etapa com a menor taxa de conversão **aplicável** entre as 7,
achada em cima dos valores que o backend já calculou (nunca um campo
novo na API, nunca uma fórmula nova). Deliberadamente sem linguagem
causal (nunca "o problema é X"), só "a menor conversão observada é
entre X e Y" — mesmo espírito de `lib/insights.ts` (Visão Executiva).
Um segundo insight aponta a maior variação de conversão período-a-
período. Renderizados via `InsightsPanel` (reaproveitado).

## Série mensal (`GET /analytics/funnel/series`, PR2)

Mesmo padrão de `GET /analytics/executive/series`: um ponto por mês de
calendário tocado pelo intervalo, com as 8 etapas daquele mês (mês sem
snapshot aparece com `is_applicable=False`, nunca omitido). Alimenta o
gráfico de evolução temporal (`FunnelEvolutionChart`, uma etapa por vez
— ver `UX.md`). Só existe para o funil **agregado**; não há série
mensal por canal nesta rodada.

## O que ainda NÃO é calculado

- **Qualificação automática de MQL/SQL** — ver `MODELAGEM.md`.
- **Atribuição de canal** (qual canal trouxe qual lead/MQL/SQL) — o que
  existe é segmentação por canal (uma linha de funil por canal), não
  modelagem de atribuição multi-touch. Nenhuma fórmula de atribuição é
  inventada.

## Comparação período-a-período

Só a **taxa de conversão** de cada etapa é comparada com o período
anterior equivalente (`previous_equivalent_range`, mesma função de
`/analytics/marketing` e `/analytics/executive`) — a contagem bruta de
cada etapa não é comparada isoladamente, porque o KPI que importa é a
taxa, não o volume absoluto (que já varia por sazonalidade/investimento).
Isso só existe no funil **agregado** (`GET /analytics/funnel`) — o
drill-down por canal (`GET /analytics/funnel/by-channel`) não compara
períodos, o eixo ali é "canal A vs. canal B" (mesmo critério de
`/analytics/marketing/by-channel`).
