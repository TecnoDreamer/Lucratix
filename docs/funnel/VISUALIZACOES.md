# Visualizações do Funil — redesign (2026-09-04)

Motivado por um prompt de UX focado nos gráficos da tela de Funil (a modelagem/KPIs/PDF documentados no restante desta pasta não mudam). Diagnóstico completo em [`docs/charts/ARQUITETURA_DE_GRAFICOS.md`](../charts/ARQUITETURA_DE_GRAFICOS.md); este documento cobre só as decisões específicas do domínio do Funil.

## O problema

`FunnelStagesChart` já posicionava o NOME de cada etapa à direita do trapézio (`LabelList position="right"`), mas um segundo `LabelList` desenhava o VALOR em branco **dentro** do trapézio (`position="center"`). Em etapas estreitas — o caso normal no fim de qualquer funil real, e o caso extremo quando a diferença de escala entre etapas é grande (ex.: 10.000.000 → 500.000 → ... → 1) — o texto branco centralizado não cabe e fica ilegível ou cortado.

## A solução

Um único bloco de texto externo, à direita do trapézio, combinando:
1. nome da etapa;
2. valor formatado + conversão em relação à etapa anterior (`905 · 8,1% de Visitas`), quando aplicável;
3. um conector fino ligando o canto direito do trapézio ao início do texto — ajuda a associação visual quando o trapézio é muito estreito.

Implementado como `content` customizado do `LabelList` (`ExternalStageLabel`, em `funnel-stages-chart.tsx`) em vez de dois `LabelList` separados. As coordenadas usadas (`x`, `y`, `width`, `height`) são sempre as que o próprio Recharts calcula para aquela etapa naquele render — nunca um valor fixo. Isso importa especialmente para o requisito de robustez a escala extrema: o Recharts distribui a altura total do gráfico em bandas **iguais** por etapa (a largura de cada trapézio varia com o valor, a altura da banda não) — então o espaçamento vertical entre labels nunca depende de quão desproporcional é um valor, só da quantidade de etapas.

A conversão mostrada não é recalculada — vem de `analytics.conversions` (o mesmo array que `StageConversionChart` já consome), passado como prop novo e opcional (`conversions?: StageConversion[]`) para `FunnelStagesChart`.

## Conversão por etapa: barras horizontais

O gráfico de barras verticais com nomes de transição inclinados (`angle={-25}` no eixo X) foi substituído por barras horizontais (`layout="vertical"` do Recharts) — o nome completo da transição (ex.: "Oportunidades → Clientes") cabe por extenso no eixo de categoria, sem inclinação nem corte. A altura do gráfico passou a escalar com o número de transições em vez de fixa.

## Tooltip

Ambos os gráficos passaram a usar o `ChartTooltip` compartilhado (`docs/charts/ARQUITETURA_DE_GRAFICOS.md`). O da conversão por etapa ganhou conteúdo rico — taxa de conversão, contagem absoluta de cada etapa, perda (subtração simples, não uma métrica nova) e taxa de abandono — quando o componente recebe o prop novo `stages` (valores absolutos, já buscados pela tela em `analytics.stages`).
