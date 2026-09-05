# Testes dos componentes de gráfico

## Por que lógica pura, não simulação de hover no Recharts

`ResponsiveContainer` (usado por todo gráfico Recharts do produto) precisa medir a largura/altura real do elemento pai para desenhar qualquer coisa — em jsdom (ambiente de teste, sem layout real de navegador) essa medição normalmente resulta em `0×0`, e o Recharts não desenha nenhum conteúdo interno (nem barras, nem labels, nem tooltip). Por isso os testes de componente já existentes neste projeto (antes desta rodada) nunca verificam o SVG renderizado — verificam `role="img"`/`aria-label` do container e a tabela alternativa (`sr-only` ou sempre visível).

Esta rodada segue exatamente o mesmo critério: qualquer lógica de CONTEÚDO (o que aparece no tooltip, como o label externo do funil combina nome+valor+conversão) foi extraída como **função pura, exportada, sem hooks** — testável direto, sem precisar simular layout/hover que o ambiente de teste não consegue produzir de forma confiável:

- `buildConversionTooltipItems` (`stage-conversion-chart.tsx`) — monta os itens do tooltip rico (taxa, contagens, perda, abandono) a partir de `(row, stages, t, tFields, notApplicableLabel)`.
- `buildStageLabelData` (`funnel-stages-chart.tsx`) — monta nome + conversão-em-relação-à-anterior por etapa aplicável do funil.
- `ChartTooltip` em si (`chart-tooltip.tsx`) é testado por render direto (é um componente burro, sem `ResponsiveContainer`/Recharts no meio — renderiza normalmente em jsdom).

## Cobertura desta rodada

- `chart-tooltip.spec.tsx`: nada renderizado quando inativo ou sem itens; título+itens aparecem quando ativo; funciona sem título.
- `funnel-stages-chart.spec.tsx`: comportamento existente preservado (sem etapa aplicável → mensagem; corte no meio nunca vira 0; tabela `sr-only`) + `buildStageLabelData`: primeira etapa nunca tem conversão, combinação nome+conversão correta, funciona sem o array de conversões, e com diferença extrema de escala entre etapas (não produz `NaN`/`undefined` no texto).
- `stage-conversion-chart.spec.tsx`: comportamento existente preservado (gargalo, mensagem vazia, coluna de comparação condicional) + compatibilidade sem o prop `stages` novo + `buildConversionTooltipItems`: com `stages` inclui contagens/perda; sem `stages` cai para taxa+abandono; taxa não aplicável nunca vira número inventado.
- `funnel-evolution-chart.spec.tsx`/`channel-bar-chart.spec.tsx`: suíte existente sem alteração — o tooltip novo não muda nenhum comportamento coberto por esses testes (eles nunca simulavam hover).

## O que fica para verificação manual/visual (não automatizável em jsdom)

- Legibilidade real do tooltip (contraste, padding, posição) em dark/light mode.
- Ausência de sobreposição de label em um funil com diferença extrema de escala entre etapas — a lógica de dados é testada (`buildStageLabelData`), mas o posicionamento geométrico final depende do layout real do Recharts, que só existe num navegador de verdade.
- Responsividade nos breakpoints principais.

Conferido via `preview_start` (dev server real) antes do merge — ver relatório da PR.
