import { useTranslations } from "next-intl";
import { getMetricById } from "@/domain/metrics/metric-utils";
import type { PeriodComparison } from "@/lib/metrics";

/** Sentido "bom/ruim" de uma variação de KPI — nunca o mesmo que "subiu/desceu"
 * (CAC caindo é bom mesmo sendo uma variação negativa; ver
 * `domain/metrics/metric-types.ts::MetricDirection`). `null` quando não há
 * dado suficiente pra comparar (RN-003): "sem comparação" não é "estável". */
export type ComparisonTone = "positive" | "negative" | "neutral";

export function getComparisonTone(metricId: string, comparison: PeriodComparison): ComparisonTone | null {
  if (comparison.percent_change === null) return null;
  if (comparison.percent_change === 0) return "neutral";
  const wentUp = comparison.percent_change > 0;
  const lowerIsBetter = getMetricById(metricId)?.direction === "lower_is_better";
  const positive = lowerIsBetter ? !wentUp : wentUp;
  return positive ? "positive" : "negative";
}

/** Classe de cor Tailwind por tom — cor sozinha nunca é a única pista (ver
 * `useComparisonToneLabel`, que devolve a palavra visível "melhora"/"piora"
 * a ser exibida junto). */
export function comparisonToneClass(tone: ComparisonTone): string {
  if (tone === "positive") return "text-emerald-700 dark:text-emerald-400";
  if (tone === "negative") return "text-rose-600 dark:text-rose-400";
  return "text-slate-500 dark:text-slate-400";
}

/** Palavra visível do tom (namespace `common`, 3 idiomas) — exibida junto do
 * ícone de seta e da cor, nunca no lugar deles: quem não distingue verde de
 * vermelho ainda lê "melhora"/"piora" no texto (WCAG 1.4.1, não usar só cor). */
export function useComparisonToneLabel(): (tone: ComparisonTone) => string {
  const t = useTranslations("common");
  return (tone) =>
    tone === "positive" ? t("trendImproved") : tone === "negative" ? t("trendWorsened") : t("trendStable");
}
