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

## Roadmap: camada de personalização (fora desta rodada)

O prompt que motivou esta rodada também pede uma camada reutilizável de personalização de gráfico — menu "Personalizar", presets (Padrão/Compacto/Analítico/Apresentação), matriz de compatibilidade por tipo de dado, e persistência da preferência por usuário+organização+gráfico. Deliberadamente fora desta PR (que só corrige os bugs visuais existentes): é uma feature nova de UX, não uma correção, com risco e tamanho bem diferentes. Fica documentado aqui como próxima rodada:

- **Composição `ChartShell`** (`ChartHeader`/`ChartToolbar`/`ChartRenderer`/`ChartTooltip` — já existe/`ChartLegend`/`ChartSettings`/`ChartEmptyState`/`ChartErrorState`) — envelope reutilizável por qualquer tela (Dashboard, Analytics, Financeiro, Marketing, Produtos, Experimentos), não só o Funil.
- **Persistência**: a tabela `user_workspace_preferences` existente (`apps/api/app/models/user_workspace_preference.py`) é de propósito único (`quick_access`, um valor por usuário+organização) — não serve para múltiplos `chart_key` por usuário+organização. Uma tabela nova (`user_chart_preferences`: `user_id`+`organization_id`+`chart_key`+`schema_version`+`preferences_json`) é o desenho natural, a criar só quando a UI de personalização existir de verdade (não faz sentido persistir uma preferência que a UI ainda não oferece).
