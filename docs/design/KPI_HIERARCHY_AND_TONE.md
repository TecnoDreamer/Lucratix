# Hierarquia de KPIs e sinalização de tendência

> Decisões de design da PR `feat/redesign-ux-decisao-a11y` (redesenho UX/UI +
> correções de acessibilidade). Nenhuma métrica foi criada, removida ou
> recalculada — só a apresentação mudou.

## 1. Por que hierarquia

O Dashboard mostrava os 7 KPIs (Receita, Lucro, Margem, CAC, Conversão,
Ticket médio, Recorrência) em cartões idênticos, mesma grade, mesmo peso
visual. Sem hierarquia, o usuário não tem pista de qual número olhar
primeiro pra saber "o mês foi bom ou ruim" — precisa ler os 7 pra formar
uma opinião.

**Decisão:** separar em dois grupos, mesma ordem/rótulos de antes:

- **Principais** (`lib/kpi.ts`-adjacentes, cartão maior): Receita, Lucro,
  Margem, CAC — os 4 financeiros que decidem sozinhos se o período foi
  bom ou ruim.
- **Outros** (cartão menor): Conversão, Ticket médio, Recorrência —
  operacionais, informam o "porquê" depois que os principais já disseram
  o "o quê".

Critério de corte: métricas financeiras agregadas (dinheiro/margem/custo de
aquisição) vs. métricas de taxa/comportamento. Não é o único corte
possível — é o mais direto de justificar sem introduzir um conceito de
"importância" configurável, que o backend não modela.

Implementado em [`components/kpi-card.tsx`](../../apps/web/src/components/kpi-card.tsx)
(`size="primary" | "secondary"`) e usado por
[`dashboard/page.tsx`](../../apps/web/src/app/organizations/%5Bid%5D/dashboard/page.tsx)
e, desde `feat/unify-kpi-card`, também pelo `MetricGrid` da Visão
Executiva e de Marketing — ver seção 3.

## 2. Tom da variação nunca é só cor

Regra de negócio pré-existente (`domain/metrics/metric-types.ts::MetricDirection`):
CAC subir é uma notícia ruim mesmo sendo uma variação numericamente
positiva. O componente que já respeitava isso (`ComparisonBadge`, em
Analytics) sinalizava o resultado (bom/ruim) **só pela cor** do texto —
verde/vermelho. Quem não distingue as duas cores (daltonismo, tela em
preto-e-branco, impressão) via a seta de direção (sobe/desce), mas não o
julgamento "isso é bom pra essa métrica" — informação que só existia na
cor.

**Decisão:** extrair o julgamento bom/ruim para `lib/kpi.ts::getComparisonTone`
(pura, testável, mesma fonte que já decidia a cor) e adicionar uma
**palavra visível** ao lado da seta e da cor — `useComparisonToneLabel()`
devolve "melhora" / "piora" / "estável" nos 3 idiomas. A cor continua
existindo (ajuda quem enxerga as duas), só deixa de ser a única pista
(WCAG 1.4.1). Nenhuma regra de negócio mudou: `getComparisonTone` é a
mesma lógica que já existia inline em `ComparisonBadge`, só nomeada e
reaproveitada no Dashboard (que antes nem tinha essa checagem — a
variação de receita ali usava só `percent_change >= 0`, sem olhar a
direção da métrica, porque receita é `higher_is_better` e o bug nunca
apareceu na prática; ficaria errado no dia em que uma métrica
`lower_is_better` ganhasse comparação nesse cartão).

## 3. Unificação com Analytics/Marketing (`feat/unify-kpi-card`)

*Dívida fechada.* `Dashboard` e a Visão Executiva/Marketing (`MetricGrid`,
em `analytics/page.tsx`) agora usam o mesmo `KpiCard` — exatamente a
adaptação prevista aqui: `MetricGrid` monta `trend` como o `ReactNode`
composto de `ComparisonBadge` (variação vs. período anterior) +
`TargetProgressLine` (progresso de meta, só receita/lucro), e passa pro
`KpiCard` junto com `reason` (motivo de "não aplicável", já traduzido).
Nenhuma fórmula, nenhuma chamada de API mudou — só o cartão que renderiza
o valor.

**Hierarquia primário/secundário chegou nas duas telas:**
- Visão Executiva: mesmo corte do Dashboard (Receita/Lucro/Margem/CAC
  primário; Conversão/Ticket médio/Recorrência secundário) — mesma
  fonte de decisão (`PRIMARY_METRIC_KEYS`), só reaplicada aqui.
- Marketing: ROAS/ROI (o que decide se o investimento valeu a pena) como
  primário; CTR/CPC/CPM/CPL/CPA (custo/alcance por etapa do funil de
  mídia) como secundário — critério novo, mesmo princípio "o que decide
  primeiro" do resto do produto.

`SeriesGrid` (seção Evolução, os 7 gráficos mensais) **não** entrou nesta
unificação: `KpiCard` espera um `value` de texto único, não um corpo de
gráfico — aplicar hierarquia aos cartões de gráfico exigiria estender o
componente pra aceitar conteúdo livre, mudando seu contrato pros 2 usos
já existentes. Ficou de fora por escopo (o pedido foi "cartão de KPI",
que é `MetricGrid`), não por dificuldade técnica; registrado como
possível próximo passo se fizer sentido dar destaque visual às métricas
principais também na Evolução.
