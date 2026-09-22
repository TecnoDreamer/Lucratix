/** Observações estruturadas sobre o funil do período — mesmo espírito de
 * `lib/insights.ts` (nunca inventa causalidade nem dado novo, só lê o que o
 * backend já calculou). Pura, sem `useTranslations` (textos entram prontos
 * via `copy`, montado pelo componente — ver `lib/insights.ts` pro porquê).
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

export interface FunnelInsightCopy {
  stageLabel(stage: string): string;
  biggestLeak: { title: string; context: (from: string, to: string) => string; cta: (from: string, to: string) => string };
  biggestGrowth: { title: string; context: (from: string, to: string) => string; cta: string };
  biggestDrop: { title: string; context: (from: string, to: string) => string; cta: string };
}

export function computeFunnelInsights(
  conversions: StageConversionWithComparison[],
  copy: FunnelInsightCopy,
  period?: string
): Insight[] {
  const insights: Insight[] = [];

  const bottleneck = findBottleneck(conversions);
  if (bottleneck) {
    const from = copy.stageLabel(bottleneck.from_stage);
    const to = copy.stageLabel(bottleneck.to_stage);
    insights.push({
      id: "funnel-bottleneck",
      kind: "biggest_leak",
      tone: "negative",
      title: copy.biggestLeak.title,
      evidence: `${from} → ${to}: ${formatPercentage(bottleneck.conversion_rate.value!)}`,
      period,
      context: copy.biggestLeak.context(from, to),
      cta: copy.biggestLeak.cta(from, to),
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
    const from = copy.stageLabel(biggest.from_stage);
    const to = copy.stageLabel(biggest.to_stage);
    const positive = pct > 0;
    insights.push({
      id: "funnel-biggest-mover",
      kind: positive ? "biggest_growth" : "biggest_drop",
      tone: pct === 0 ? "neutral" : positive ? "positive" : "negative",
      title: positive ? copy.biggestGrowth.title : copy.biggestDrop.title,
      evidence: `${from} → ${to} ${formatPercentage(pct, { signed: true })}`,
      period,
      context: positive ? copy.biggestGrowth.context(from, to) : copy.biggestDrop.context(from, to),
      cta: positive ? copy.biggestGrowth.cta : copy.biggestDrop.cta,
    });
  }

  return insights;
}
