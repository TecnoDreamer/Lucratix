import type { Insight, InsightKind } from "@/lib/insights";
import {
  IconAlertCircle,
  IconClock,
  IconDatabase,
  IconFunnel,
  IconMegaphone,
  IconTarget,
  IconTrendingDown,
  IconTrendingUp,
} from "@/components/icons";

const TONE_STYLE: Record<Insight["tone"], string> = {
  positive:
    "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950",
  negative:
    "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
  neutral:
    "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900",
};

const TONE_ICON_COLOR: Record<Insight["tone"], string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-amber-600 dark:text-amber-400",
  neutral: "text-slate-500 dark:text-slate-400",
};

const TONE_EVIDENCE_STYLE: Record<Insight["tone"], string> = {
  positive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  negative: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  neutral: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

// Ícone por tipo de insight (não por tom — dois insights negativos podem
// ser situações bem diferentes, o ícone ajuda a distinguir de relance).
// Tom continua sendo a pista de bom/ruim (cor); o ícone nunca é a única
// pista de "que tipo de achado é este" nem de "é bom ou ruim".
const KIND_ICON: Record<InsightKind, typeof IconTrendingUp> = {
  biggest_growth: IconTrendingUp,
  biggest_drop: IconTrendingDown,
  biggest_leak: IconFunnel,
  channel_contribution: IconMegaphone,
  target_hit: IconTarget,
  target_missed: IconTarget,
  margin_deteriorating: IconAlertCircle,
  cac_up_conversion_down: IconAlertCircle,
  incomplete_data: IconDatabase,
  no_baseline: IconClock,
};

/**
 * Um insight estruturado: título curto, evidência numérica, período,
 * contexto e uma próxima ação — nunca só uma frase solta (ver `lib/insights.ts`
 * e o prompt de redesenho UX/UI, seção de insights). Nunca renderiza nada
 * quando não há insight algum (dado insuficiente), em vez de mostrar uma
 * caixa vazia.
 */
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {insights.map((insight) => {
        const Icon = KIND_ICON[insight.kind];
        return (
          <div
            key={insight.id}
            className={`flex flex-col gap-2 rounded-xl border p-4 ${TONE_STYLE[insight.tone]}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE_ICON_COLOR[insight.tone]}`} aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{insight.title}</p>
            </div>
            {(insight.evidence || insight.period) && (
              <div className="flex flex-wrap items-center gap-2">
                {insight.evidence && (
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${TONE_EVIDENCE_STYLE[insight.tone]}`}
                  >
                    {insight.evidence}
                  </span>
                )}
                {insight.period && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{insight.period}</span>
                )}
              </div>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300">{insight.context}</p>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">{insight.cta}</p>
          </div>
        );
      })}
    </div>
  );
}
