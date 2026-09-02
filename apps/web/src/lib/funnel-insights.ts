/** Observações determinísticas sobre o funil do período — mesmo espírito
 * de `lib/insights.ts` (nunca inventa causalidade nem dado novo, só lê o
 * que o backend já calculou). Strings em pt-BR direto no código, mesma
 * escolha já feita em `insights.ts` (que também não passa por i18n).
 */

import { formatPercentage } from "@/lib/formatters";
import type { StageConversion, StageConversionWithComparison } from "@/lib/funnel-metrics";
import type { Insight } from "@/lib/insights";

/** "Maior gargalo": a etapa com a menor taxa de conversão aplicável entre
 * as 7 — nunca um cálculo novo, só o mínimo de valores já computados pelo
 * backend (RF do prompt de funil: detecção de gargalo determinística, sem
 * linguagem causal). `null` quando nenhuma conversão é aplicável (sem dado
 * no período). */
export function findBottleneck<T extends StageConversion>(conversions: T[]): T | null {
  const applicable = conversions.filter((c) => c.conversion_rate.is_applicable && c.conversion_rate.value !== null);
  if (applicable.length === 0) return null;
  return applicable.reduce((min, curr) => (curr.conversion_rate.value! < min.conversion_rate.value! ? curr : min));
}

const STAGE_LABELS: Record<string, string> = {
  impressions: "Impressões",
  visits: "Visitas",
  leads: "Leads",
  mqls: "MQLs",
  sqls: "SQLs",
  opportunities: "Oportunidades",
  customers: "Clientes",
  repeat_purchases: "Recompras",
};

export function computeFunnelInsights(conversions: StageConversionWithComparison[]): Insight[] {
  const insights: Insight[] = [];

  const bottleneck = findBottleneck(conversions);
  if (bottleneck) {
    insights.push({
      id: "funnel-bottleneck",
      text: `A menor taxa de conversão do período está entre ${STAGE_LABELS[bottleneck.from_stage]} e ${STAGE_LABELS[bottleneck.to_stage]}: ${formatPercentage(bottleneck.conversion_rate.value!)}.`,
      tone: "neutral",
    });
  }

  const withComparison = conversions.filter(
    (c) => c.conversion_rate.is_applicable && c.conversion_rate_comparison.percent_change !== null
  );
  if (withComparison.length > 0) {
    const biggest = withComparison.reduce((max, curr) =>
      Math.abs(curr.conversion_rate_comparison.percent_change!) >
      Math.abs(max.conversion_rate_comparison.percent_change!)
        ? curr
        : max
    );
    const pct = biggest.conversion_rate_comparison.percent_change!;
    insights.push({
      id: "funnel-biggest-mover",
      text: `A conversão de ${STAGE_LABELS[biggest.from_stage]} para ${STAGE_LABELS[biggest.to_stage]} teve a maior variação do período: ${formatPercentage(pct, { signed: true })} vs. o período anterior.`,
      tone: pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral",
    });
  }

  return insights;
}
