/** Observações estruturadas sobre o dashboard executivo — nunca inventa
 * causalidade nem dado novo, só lê o que o backend já calculou (RN-003:
 * comparação vem `null` quando não há dado suficiente, nunca 0 forçado).
 * Pura, sem acesso a rede nem a `useTranslations` (mesmo padrão de
 * `formatPercentChange`, que recebe `notApplicableLabel` de fora): os
 * textos completos por tipo de insight entram prontos via `copy`, montado
 * pelo componente a partir de `useTranslations("analytics.insights")` —
 * assim esta função continua testável sem `<NextIntlClientProvider>`.
 *
 * Cada `Insight` tem 5 partes (prompt de redesenho UX/UI): título curto,
 * evidência numérica, período, contexto e uma próxima ação (CTA). Nunca
 * preenche uma parte que não tem dado por trás — `evidence`/`period` são
 * opcionais para os poucos tipos que genuinamente não têm um número ou um
 * período associado (ex.: `no_baseline`).
 */

import { getMetricById } from "@/domain/metrics/metric-utils";
import { formatPercentage } from "@/lib/formatters";
import type { ExecutiveDashboard, ExecutiveTargets, MetricWithComparison, TargetMetricKey } from "@/lib/metrics";

export type InsightTone = "positive" | "negative" | "neutral";

/** Vocabulário comum a todo o produto (Analytics, Funil, Marketing,
 * Dashboard) — usado pelo `InsightsPanel` para escolher ícone/estilo sem
 * precisar conhecer o texto de cada tela. */
export type InsightKind =
  | "biggest_growth"
  | "biggest_drop"
  | "biggest_leak"
  | "channel_contribution"
  | "target_hit"
  | "target_missed"
  | "margin_deteriorating"
  | "cac_up_conversion_down"
  | "incomplete_data"
  | "no_baseline";

export interface Insight {
  id: string;
  kind: InsightKind;
  tone: InsightTone;
  title: string;
  /** Número que sustenta o insight, já formatado (ex.: "Receita +12,4%").
   * Ausente só quando o tipo de insight não é sobre uma variação numérica
   * (ex.: `no_baseline`). */
  evidence?: string;
  /** Rótulo do período a que a evidência se refere (ex.: "ago/2026").
   * Ausente quando o insight não é sobre um período específico. */
  period?: string;
  context: string;
  cta: string;
}

const EXECUTIVE_METRIC_KEYS: TargetMetricKey[] = [
  "revenue",
  "profit",
  "margin",
  "cac",
  "conversion_rate",
  "average_ticket",
  "recurrence_rate",
];

/** CAC subir é uma má notícia mesmo sendo uma variação numericamente
 * positiva (ver `domain/metrics/metric-types.ts::MetricDirection`) — nunca
 * decidir "cresceu"/"caiu" olhando só o sinal do número. */
function isGoodChange(metricId: string, percentChange: number): boolean {
  const lowerIsBetter = getMetricById(metricId)?.direction === "lower_is_better";
  return lowerIsBetter ? percentChange < 0 : percentChange > 0;
}

export interface ExecutiveInsightCopy {
  metricLabel(key: TargetMetricKey): string;
  biggestGrowth: { title: string; context: (metric: string) => string; cta: string };
  biggestDrop: { title: string; context: (metric: string) => string; cta: string };
  marginDeteriorating: { title: string; context: string; cta: string };
  cacUpConversionDown: { title: string; context: string; cta: string };
  targetHit: { title: string; context: (metric: string) => string; cta: string };
  targetMissed: { title: string; context: (metric: string) => string; cta: string };
  incompleteData: { title: string; context: (available: number, total: number) => string; cta: string };
}

/** Insights da Visão Executiva — lê `ExecutiveDashboard` (7 KPIs com
 * comparação) e `ExecutiveTargets` (progresso de meta, só receita/lucro são
 * agregáveis — RN de `targets_service.py`). `targets` é opcional porque a
 * tela pode terminar de carregar o dashboard antes das metas. */
export function computeExecutiveInsights(
  dashboard: ExecutiveDashboard,
  targets: ExecutiveTargets | null,
  copy: ExecutiveInsightCopy,
  period: string
): Insight[] {
  const insights: Insight[] = [];
  // Métrica que já ganhou uma regra específica (mais acionável) sai do
  // pool genérico de "maior alta/queda" abaixo — evita 2 cartões dizendo
  // basicamente o mesmo fato (ex.: "margem caiu 5%" e "maior queda: margem
  // -5%" ao mesmo tempo).
  const consumed = new Set<TargetMetricKey>();

  // Generaliza a antiga regra "receita subiu mas margem caiu": dispara
  // sempre que a margem piora, independente da receita — deteriorar é
  // notícia ruim com receita subindo, estável ou caindo.
  const margin = dashboard.margin;
  if (margin.current.is_applicable && margin.comparison.percent_change !== null && margin.comparison.percent_change < 0) {
    insights.push({
      id: "margin-deteriorating",
      kind: "margin_deteriorating",
      tone: "negative",
      title: copy.marginDeteriorating.title,
      evidence: `${copy.metricLabel("margin")} ${formatPercentage(margin.comparison.percent_change, { signed: true })}`,
      period,
      context: copy.marginDeteriorating.context,
      cta: copy.marginDeteriorating.cta,
    });
    consumed.add("margin");
  }

  // Composto explicitamente pedido pelo prompt de redesenho: CAC subindo
  // E conversão caindo no mesmo período — funil perdendo eficiência dos
  // dois lados ao mesmo tempo, mais grave que qualquer um isolado.
  const cac = dashboard.cac;
  const conversion = dashboard.conversion_rate;
  if (
    cac.current.is_applicable &&
    cac.comparison.percent_change !== null &&
    cac.comparison.percent_change > 0 &&
    conversion.current.is_applicable &&
    conversion.comparison.percent_change !== null &&
    conversion.comparison.percent_change < 0
  ) {
    insights.push({
      id: "cac-up-conversion-down",
      kind: "cac_up_conversion_down",
      tone: "negative",
      title: copy.cacUpConversionDown.title,
      evidence: `${copy.metricLabel("cac")} ${formatPercentage(cac.comparison.percent_change, { signed: true })} · ${copy.metricLabel("conversion_rate")} ${formatPercentage(conversion.comparison.percent_change, { signed: true })}`,
      period,
      context: copy.cacUpConversionDown.context,
      cta: copy.cacUpConversionDown.cta,
    });
    consumed.add("cac");
    consumed.add("conversion_rate");
  }

  const applicable = EXECUTIVE_METRIC_KEYS.filter((key) => !consumed.has(key))
    .map((key) => ({ key, metric: dashboard[key] as MetricWithComparison }))
    .filter(
      (entry): entry is { key: TargetMetricKey; metric: MetricWithComparison } =>
        entry.metric.current.is_applicable && entry.metric.comparison.percent_change !== null
    );

  const withTone = applicable
    .map((entry) => ({ ...entry, pct: entry.metric.comparison.percent_change! }))
    .filter((entry) => entry.pct !== 0)
    .map((entry) => ({ ...entry, good: isGoodChange(entry.key, entry.pct) }));

  // Antes um único "maior variação" (bom ou ruim, ambíguo); agora dois
  // insights distintos — o que mais melhorou e o que mais piorou podem
  // conviver na mesma tela sem competir entre si.
  const growthCandidates = withTone.filter((e) => e.good);
  if (growthCandidates.length > 0) {
    const best = growthCandidates.reduce((max, curr) => (Math.abs(curr.pct) > Math.abs(max.pct) ? curr : max));
    const metric = copy.metricLabel(best.key);
    insights.push({
      id: "biggest-growth",
      kind: "biggest_growth",
      tone: "positive",
      title: copy.biggestGrowth.title,
      evidence: `${metric} ${formatPercentage(best.pct, { signed: true })}`,
      period,
      context: copy.biggestGrowth.context(metric),
      cta: copy.biggestGrowth.cta,
    });
  }

  const dropCandidates = withTone.filter((e) => !e.good);
  if (dropCandidates.length > 0) {
    const worst = dropCandidates.reduce((max, curr) => (Math.abs(curr.pct) > Math.abs(max.pct) ? curr : max));
    const metric = copy.metricLabel(worst.key);
    insights.push({
      id: "biggest-drop",
      kind: "biggest_drop",
      tone: "negative",
      title: copy.biggestDrop.title,
      evidence: `${metric} ${formatPercentage(worst.pct, { signed: true })}`,
      period,
      context: copy.biggestDrop.context(metric),
      cta: copy.biggestDrop.cta,
    });
  }

  // Só receita/lucro são metas agregáveis (target_value só vem preenchido
  // pra essas duas — ver targets_service.py); as outras 5 nunca disparam
  // aqui, sem checagem especial pro frontend precisar saber o motivo.
  for (const key of ["revenue", "profit"] as const) {
    const progress = targets?.[key];
    if (!progress || progress.target_value === null) continue;
    if (!progress.percent_of_target.is_applicable || progress.percent_of_target.value === null) continue;
    const pct = progress.percent_of_target.value;
    const metric = copy.metricLabel(key);
    if (pct >= 1) {
      insights.push({
        id: `target-hit-${key}`,
        kind: "target_hit",
        tone: "positive",
        title: copy.targetHit.title,
        evidence: `${metric} ${formatPercentage(pct)}`,
        period,
        context: copy.targetHit.context(metric),
        cta: copy.targetHit.cta,
      });
    } else {
      insights.push({
        id: `target-missed-${key}`,
        kind: "target_missed",
        tone: "negative",
        title: copy.targetMissed.title,
        evidence: `${metric} ${formatPercentage(pct)}`,
        period,
        context: copy.targetMissed.context(metric),
        cta: copy.targetMissed.cta,
      });
    }
  }

  // Mesma condição do antigo banner "dado incompleto" (financeiro OU
  // funil) — agora um insight estruturado em vez de um Alert avulso.
  if (
    dashboard.months_with_financial_data < dashboard.months_in_range ||
    dashboard.months_with_funnel_data < dashboard.months_in_range
  ) {
    insights.push({
      id: "incomplete-data",
      kind: "incomplete_data",
      tone: "neutral",
      title: copy.incompleteData.title,
      evidence: `${dashboard.months_with_financial_data}/${dashboard.months_in_range}`,
      period,
      context: copy.incompleteData.context(dashboard.months_with_financial_data, dashboard.months_in_range),
      cta: copy.incompleteData.cta,
    });
  }

  return insights;
}
