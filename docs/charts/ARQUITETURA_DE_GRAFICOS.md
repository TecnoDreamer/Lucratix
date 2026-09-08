# Arquitetura de gráficos

## `ChartTooltip` — tooltip compartilhado (2026-09-04)

Antes desta rodada, cada gráfico Recharts do produto (`funnel-stages-chart.tsx`, `stage-conversion-chart.tsx`, `funnel-evolution-chart.tsx`, `channel-bar-chart.tsx`) usava o `<Tooltip>` padrão da biblioteca sem `content` customizado — uma caixa fixa que não respeita dark mode (fundo/texto sempre claros), sem controle de padding/contraste/sombra, e sem espaço para conteúdo rico (mais de uma métrica por ponto).

`apps/web/src/components/chart-tooltip.tsx` (`ChartTooltip`) resolve isso como componente único, reutilizado pelos 4 gráficos acima:

- **Não formata nada sozinho** — recebe `title` e uma lista de `{label, value, tone?}` já formatados. A fonte única de formatação continua em `lib/formatters.ts`/`lib/metrics.ts`; o tooltip nunca reimplementa `toLocaleString`/percentual/etc.
- **`tone: "warning"`** destaca uma linha (ex.: "Perda", "Taxa de abandono") em âmbar — mesmo critério visual já usado para o "gargalo" em `StageConversionChart`.
- Cada gráfico monta seus próprios `items` num adaptador local (a função `content` passada para o `<Tooltip>` do Recharts), porque cada um tem acesso a dados diferentes (`payload`/`label` do Recharts mais o estado do próprio componente) — o `ChartTooltip` em si não conhece nada de "funil" nem "conversão".

### Onde a lógica de conteúdo do tooltip mora

Para o `StageConversionChart` (o tooltip mais rico: taxa, contagens absolutas de cada etapa, perda, abandono), a montagem dos itens é uma função pura exportada — `buildConversionTooltipItems` — em vez de ficar inline dentro do componente. Mesmo padrão em `funnel-stages-chart.tsx` (`buildStageLabelData`, monta o texto de nome+conversão de cada etapa do funil). Razão: essa lógica precisa ser testável sem depender do Recharts medir layout de verdade (ver [TESTES.md](TESTES.md)).

## Labels externos do Funil

`FunnelStagesChart` usa um `content` customizado no `LabelList` do Recharts (`ExternalStageLabel`) em vez do label embutido padrão da lib. Por quê: o padrão anterior desenhava o NOME à direita do trapézio mas o VALOR em branco DENTRO dele — ilegível em etapas estreitas (o problema piora com diferenças grandes de escala entre etapas, ex. 10.000.000 → 1).

`ExternalStageLabel` desenha nome + valor + conversão-em-relação-à-etapa-anterior num único bloco de texto à direita, ligado por um conector fino. As coordenadas (`x`, `y`, `width`, `height`) vêm sempre do próprio cálculo de layout do Recharts para aquela etapa — nunca um pixel fixo calibrado para o dataset atual, o que é o que torna a solução robusta a qualquer diferença de escala (o Recharts distribui a altura total do funil em bandas iguais por etapa, então o espaçamento vertical entre labels não depende do valor de cada etapa, só da quantidade de etapas).

## Barras horizontais na Conversão por etapa

`StageConversionChart` trocou `layout` vertical (barras verticais, nomes de transição inclinados no eixo X) por `layout="vertical"` do Recharts, que — por convenção da própria lib — produz barras HORIZONTAIS: eixo de categoria (nome da transição, ex. "Oportunidades → Clientes") por extenso, sem inclinação; eixo de valor com a taxa. A altura do gráfico escala com o número de transições (`Math.max(220, transições × 44)`) em vez de fixa, para as barras não ficarem espremidas com mais etapas.

## Biblioteca por família de gráfico

Sem mudança nesta rodada — ver [`docs/analytics/CHART_DECISIONS.md`](../analytics/CHART_DECISIONS.md), que continua a fonte de verdade: Recharts para a família do Funil (decisão de 2026-09-02), SVG artesanal para os gráficos de linha do Analytics (`SeriesChart`, `CorrelationChart`). Nenhuma dependência nova.

## Personalização de gráficos (PR2+PR3, 2026-09) — `ChartSettings`/preset + persistência já existem

`docs/charts/PERSONALIZACAO_DE_GRAFICOS.md` documenta as decisões de produto (matriz de compatibilidade, presets, persistência). Aqui, o que entrou de arquitetura:

- **`ChartSettingsDialog`** (`components/chart-settings-dialog.tsx`) — o `ChartSettings` da composição `ChartShell` abaixo. Mesma estrutura de `ConfirmDialog` (backdrop/foco/Escape/trava de scroll — seção 21 do prompt: "não invente padrão inconsistente"). Não sabe nada de nenhum gráfico específico — os controles de cada um entram via `children`.
- **`useChartSettings`** (`hooks/use-chart-settings.ts`) — o estado de preview→aplicar→cancelar→restaurar padrão (seção 11), usado uma vez por gráfico personalizável. Desde a PR3, aceita um 2º argumento opcional `persistence` (`{organizationId, chartKey, sanitize, save}`) que carrega a preferência salva no mount e salva a cada "Aplicar" (best-effort — falha de rede no save não desfaz o preview local).
- **`lib/chart-settings.ts`** — schema + presets, puro, sem UI. Fonte única da definição de cada preset (nunca duplicada entre código e a doc de produto).
- **`lib/chart-preferences.ts`** (PR3) — fetch/save (conversão camelCase ↔ snake_case na borda) + `sanitizeFunnelStagesSettings`/`sanitizeStageConversionSettings`, que nunca deixam uma preferência salva em formato inesperado chegar ao Recharts.
- **`app/models/user_chart_preference.py` + `app/modules/chart_preferences/`** (backend, PR3) — tabela e endpoint `GET/PATCH /organizations/{id}/chart-preferences/{chart_key}`. Detalhe completo em `PERSONALIZACAO_DE_GRAFICOS.md`.

## Roadmap: `ChartShell` completo (fora desta rodada)

Falta só `ChartHeader`/`ChartLegend`/`ChartEmptyState`/`ChartErrorState` pra composição completa da seção 13:

```
ChartShell
├── ChartHeader        (ainda inline em cada página — funciona bem pra 2 instâncias)
├── ChartToolbar        ✓ (o botão de engrenagem + ChartSettingsDialog)
├── ChartRenderer        ✓ (os próprios FunnelStagesChart/StageConversionChart)
├── ChartTooltip        ✓ (PR1)
├── ChartLegend        (nenhum dos 2 gráficos do Funil precisa — nenhuma implementação ainda)
├── ChartSettings        ✓ (ChartSettingsDialog + lib/chart-settings.ts)
├── ChartEmptyState        (ainda inline — cada gráfico já trata o próprio estado vazio)
└── ChartErrorState        (nenhuma implementação ainda)
```

Envelope reutilizável por qualquer tela (Dashboard, Analytics, Financeiro, Marketing, Produtos, Experimentos) só faz sentido construir quando o rollout passar do Funil pra essas telas — abstrair `ChartHeader`/`ChartEmptyState` agora, pra 2 instâncias que já funcionam bem inline, seria antecipar uma necessidade que ainda não existe.

**Persistência**: fechada na PR3 (`user_chart_preferences`: `user_id`+`organization_id`+`chart_key`+`schema_version`+`preferences_json` — não reaproveita `user_workspace_preferences`, que é de propósito único, um valor por usuário+organização, sem `chart_key`). Deixa de ser item de roadmap; ver `PERSONALIZACAO_DE_GRAFICOS.md`.
