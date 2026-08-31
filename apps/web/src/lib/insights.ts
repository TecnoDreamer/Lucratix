/** Observações determinísticas sobre o dashboard executivo — nunca
 * inventa causalidade nem dado novo, só lê `percent_change` que o backend
 * já calculou para cada KPI (RN-003: comparação já vem `null` quando não
 * há dado suficiente, nunca 0 forçado). Pura, sem acesso a rede, para ser
 * testável sem infraestrutura (mesmo padrão de `metrics.ts`/`date-ranges.ts`).
 *
 * Só 3 regras, de propósito — cada uma aponta pra algo concreto e
 * verificável no próprio dado, sem tentar "explicar" o motivo por trás.
 */

import { getMetricById } from "@/domain/metrics/metric-utils";
import { formatPercentage } from "@/lib/formatters";
import type { ExecutiveDashboard, MetricWithComparison } from "@/lib/metrics";

export interface Insight {
  id: string;
  text: string;
  tone: "positive" | "negative" | "neutral";
}

const EXECUTIVE_METRIC_KEYS = [
  "revenue",
  "profit",
  "margin",
  "cac",
  "conversion_rate",
  "average_ticket",
  "recurrence_rate",
] as const;

function isGoodChange(metricId: string, percentChange: number): boolean {
  const lowerIsBetter = getMetricById(metricId)?.direction === "lower_is_better";
  return lowerIsBetter ? percentChange < 0 : percentChange > 0;
}

function toneFor(metricId: string, percentChange: number): Insight["tone"] {
  if (percentChange === 0) return "neutral";
  return isGoodChange(metricId, percentChange) ? "positive" : "negative";
}

export function computeExecutiveInsights(dashboard: ExecutiveDashboard): Insight[] {
  const insights: Insight[] = [];

  const applicable = EXECUTIVE_METRIC_KEYS.map((key) => ({
    key,
    metric: dashboard[key] as MetricWithComparison,
  })).filter(
    (entry): entry is { key: (typeof EXECUTIVE_METRIC_KEYS)[number]; metric: MetricWithComparison } =>
      entry.metric.current.is_applicable && entry.metric.comparison.percent_change !== null
  );

  // Regra 1 — maior variação absoluta do período: "o que merece
  // investigação" (uma das perguntas que o usuário precisa conseguir
  // responder, não é um palpite).
  if (applicable.length > 0) {
    const biggest = applicable.reduce((max, curr) =>
      Math.abs(curr.metric.comparison.percent_change!) > Math.abs(max.metric.comparison.percent_change!)
        ? curr
        : max
    );
    const pct = biggest.metric.comparison.percent_change!;
    const label = getMetricById(biggest.key)?.name ?? biggest.key;
    insights.push({
      id: "biggest-mover",
      text: `${label} teve a maior variação do período: ${formatPercentage(pct, { signed: true })} vs. o período anterior.`,
      tone: toneFor(biggest.key, pct),
    });
  }

  const revenue = dashboard.revenue;
  const cac = dashboard.cac;
  const margin = dashboard.margin;

  // Regra 2 — receita subiu e CAC caiu no mesmo período: crescimento
  // eficiente (exemplo citado no próprio prompt de evolução do Analytics).
  if (
    revenue.current.is_applicable &&
    revenue.comparison.percent_change !== null &&
    revenue.comparison.percent_change > 0 &&
    cac.current.is_applicable &&
    cac.comparison.percent_change !== null &&
    cac.comparison.percent_change < 0
  ) {
    insights.push({
      id: "revenue-up-cac-down",
      text: `Receita cresceu ${formatPercentage(revenue.comparison.percent_change, { signed: true })} enquanto o CAC caiu ${formatPercentage(Math.abs(cac.comparison.percent_change))} no mesmo período.`,
      tone: "positive",
    });
  }

  // Regra 3 — receita subiu mas margem caiu: não afirma a causa, só
  // registra o fato e levanta a hipótese mais direta (custo crescendo
  // mais rápido que receita) sem confirmá-la.
  if (
    revenue.current.is_applicable &&
    revenue.comparison.percent_change !== null &&
    revenue.comparison.percent_change > 0 &&
    margin.current.is_applicable &&
    margin.comparison.percent_change !== null &&
    margin.comparison.percent_change < 0
  ) {
    insights.push({
      id: "revenue-up-margin-down",
      text: `Receita cresceu, mas a margem caiu ${formatPercentage(Math.abs(margin.comparison.percent_change))} — pode indicar custos crescendo mais rápido que a receita.`,
      tone: "negative",
    });
  }

  return insights;
}
