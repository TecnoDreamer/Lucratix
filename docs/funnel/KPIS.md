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

## O que NÃO é calculado nesta PR

- **"Maior gargalo"** — fica client-side (PR2): é só "qual das 7
  conversões tem a menor taxa", trivial de derivar na UI a partir da
  lista já ordenada por etapa. Deliberadamente **não** um campo
  server-side, e deliberadamente sem linguagem causal (nunca "o
  problema é X"), só "a menor conversão observada é entre X e Y".
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
