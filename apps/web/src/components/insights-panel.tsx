import type { Insight } from "@/lib/insights";
import { IconAlertCircle, IconSparkles, IconTrendingUp } from "@/components/icons";

const TONE_STYLE: Record<Insight["tone"], string> = {
  positive:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  negative:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

const TONE_ICON: Record<Insight["tone"], typeof IconSparkles> = {
  positive: IconTrendingUp,
  negative: IconAlertCircle,
  neutral: IconSparkles,
};

/** Observações determinísticas (ver `lib/insights.ts`) sobre o dashboard
 * executivo do período selecionado — nunca renderiza nada quando não há
 * insight (dado insuficiente), em vez de mostrar uma caixa vazia. */
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      {insights.map((insight) => {
        const Icon = TONE_ICON[insight.tone];
        return (
          <div
            key={insight.id}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${TONE_STYLE[insight.tone]}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{insight.text}</p>
          </div>
        );
      })}
    </div>
  );
}
