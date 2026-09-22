# Taxonomia de insights estruturados

> Decisões de design da PR `feat/insights-taxonomy` (continuação do
> redesenho UX/UI — ver [`KPI_HIERARCHY_AND_TONE.md`](KPI_HIERARCHY_AND_TONE.md)).
> Nenhuma métrica foi criada, removida ou recalculada — só a apresentação
> das observações já existentes mudou de "uma frase solta" pra "achado
> estruturado".

## 1. Antes → depois

`lib/insights.ts` e `lib/funnel-insights.ts` já existiam e já eram
determinísticos (nunca inventam causalidade nem dado novo). O que faltava:
cada `Insight` era só `{id, text, tone}` — uma frase em pt-BR fixo, sem
i18n, sem estrutura. Agora todo `Insight` tem 5 partes fixas:

```ts
interface Insight {
  id: string;
  kind: InsightKind;   // vocabulário comum (ver seção 2)
  tone: "positive" | "negative" | "neutral";
  title: string;       // curto
  evidence?: string;   // número que sustenta o achado, já formatado
  period?: string;     // "ago/2026" ou "jul/2026 – ago/2026"
  context: string;     // frase de apoio, nunca afirma causa não observada
  cta: string;         // próxima ação sugerida
}
```

`evidence`/`period` são opcionais só para os poucos tipos que genuinamente
não têm um número ou período associado (nenhum tipo implementado nesta PR
precisou omitir os dois).

**Por que os textos não ficam dentro da função pura:** `computeExecutiveInsights`
e `computeFunnelInsights` continuam sem chamar `useTranslations` — recebem
um objeto `copy` já resolvido (mesmo padrão de `formatPercentChange`, que
recebe `notApplicableLabel` de fora). Isso mantém as duas funções
testáveis sem `<NextIntlClientProvider>` e, ao mesmo tempo, dá i18n real
em produção (pt-BR/en/es) — decisão diferente da anterior, que dizia
explicitamente "não passa por i18n, mesmo espírito do resto do arquivo";
essa PR muda isso de propósito porque o prompt de redesenho pede insight
i18n'd.

## 2. As 11 categorias do prompt de redesenho — onde cada uma mora

| Categoria do prompt | `InsightKind` | Onde vive | Fonte de dado |
|---|---|---|---|
| Maior crescimento | `biggest_growth` | Visão Executiva, Funil (por etapa) | `ExecutiveDashboard` / `StageConversionWithComparison` |
| Maior queda | `biggest_drop` | Visão Executiva, Funil (por etapa) | idem |
| Maior vazamento (funil) | `biggest_leak` | Funil | `findBottleneck` (menor conversão aplicável) |
| Contribuição por canal | `channel_contribution` | Marketing | `ChannelMarketing[]` (maior ROAS aplicável) |
| Meta batida | `target_hit` | Visão Executiva | `ExecutiveTargets` (só receita/lucro são agregáveis) |
| Meta perdida | `target_missed` | Visão Executiva | idem |
| Margem deteriorando | `margin_deteriorating` | Visão Executiva | `dashboard.margin.comparison` |
| CAC subindo + conversão caindo | `cac_up_conversion_down` | Visão Executiva | `dashboard.cac` + `dashboard.conversion_rate` |
| Dado incompleto | `incomplete_data` | Visão Executiva | `months_with_financial_data`/`months_with_funnel_data` vs. `months_in_range` — substituiu o `Alert` avulso que existia antes |
| Baseline ausente | `no_baseline` | *(não migrado nesta PR)* | Dashboard já tem uma mensagem clara própria (`noBaselineToCompare`); ver seção 3 |
| Amostra insuficiente | *(sem kind dedicado)* | Correlação (`CorrelationPanel`), já existente | ver seção 3 |

## 3. Duas categorias deliberadamente não migradas

- **Baseline ausente:** o Dashboard já mostra `t("noBaselineToCompare")`
  ("Nenhum baseline registrado ainda para comparar.") quando
  `revenueComparison` é `null` — uma frase única, sem evidência numérica
  possível (não há o que comparar). Forçar as 5 partes do `Insight` nesse
  caso item duplicaria informação sem ganho real. O `kind: "no_baseline"`
  já existe no vocabulário (`InsightsPanel` já sabe qual ícone usar) para
  quando/se essa tela adotar o componente completo.
- **Amostra insuficiente:** `CorrelationPanel` já mostra a frase exata que
  o backend devolve (`"poucos meses com as duas métricas aplicáveis
  (mínimo 3)"` / `"uma das métricas não varia no período"`) mais
  `monthsUsed`. Essas frases vêm prontas do backend em pt-BR
  (`app/modules/metrics/engine.py::correlation`), fora do escopo desta PR
  — i18n'izá-las exigiria o backend emitir um **código** de motivo em vez
  de uma frase pronta (mudança de contrato de API, não decidida aqui).
  Registrado como débito, não escondido.

## 4. Consolidação de regras (menos duplicação, não menos cobertura)

- As antigas regras `revenue-up-cac-down` (positiva) e
  `revenue-up-margin-down` (negativa, só disparava com receita subindo)
  foram substituídas por `biggest_growth`/`biggest_drop` (mais genérico,
  dispara pro KPI que mais mudou, seja qual for) e por
  `margin_deteriorating` (agora dispara sempre que a margem piora,
  independente da receita) — mais cobertura, não menos.
- Uma métrica que já disparou uma regra específica (`margin_deteriorating`,
  `cac_up_conversion_down`) sai do pool genérico de "maior alta/queda" —
  evita 2 cartões dizendo o mesmo fato (ex.: "margem caiu 5%" e "maior
  queda: margem -5%" ao mesmo tempo).
- O antigo `Alert` de "dado incompleto" na Visão Executiva foi substituído
  pelo insight `incomplete_data` — mesma condição, mesma contagem de
  meses, agora dentro do painel de insights em vez de um aviso solto no
  topo da tela.

## 5. Teste de cada peça

- `lib/insights.spec.ts`, `lib/funnel-insights.spec.ts`,
  `lib/marketing-insights.spec.ts`: função pura, `copy` fake (strings
  reconhecíveis, não o catálogo real) — provam que o `kind`/`tone`/
  `evidence`/`period` certos saem pra cada combinação de dado.
  `formatters.spec.ts` ganhou `formatPeriodRange`.
- `components/insights-panel.spec.tsx`: as 5 partes renderizam; sem
  `evidence`/`period` não quebra nem mostra linha vazia; múltiplos
  insights renderizam na ordem recebida.
- `analytics.spec.tsx`, `funnel.spec.tsx`, `marketing.spec.tsx`: end-to-end
  com o catálogo pt-BR de verdade (`vitest.setup.ts`), incluindo os 2
  testes atualizados que antes checavam o texto antigo.
