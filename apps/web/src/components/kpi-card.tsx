import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { MetricHelp } from "@/components/metric-help";

/**
 * Cartão de KPI com hierarquia visual: `size="primary"` (maior, valor em
 * destaque) para os poucos indicadores que decidem se o período foi bom ou
 * ruim; `size="secondary"` (menor) para o resto. Usado pelo Dashboard
 * (`organizations/[id]/dashboard/page.tsx`) e pelo `MetricGrid` da Visão
 * Executiva/Marketing (`organizations/[id]/analytics/page.tsx`) — mesmo
 * componente nas 3 telas que mostram KPI, único lugar pra mudar o visual
 * do cartão.
 */
export function KpiCard({
  size,
  label,
  metricHelpKey,
  icon: Icon,
  value,
  reason,
  trend,
  index = 0,
}: {
  size: "primary" | "secondary";
  label: string;
  /** Chave do glossário pro tooltip de ajuda (`MetricHelp`) — omitir some com o "?". */
  metricHelpKey?: string;
  icon: (props: { className?: string }) => ReactNode;
  value: string;
  /** Motivo de "não aplicável" (RN-003), já traduzido — não é decoração, é
   * a explicação de por que o valor acima está vazio. */
  reason?: string | null;
  /** Linha de tendência (seta + cor + palavra visível) — já composta pelo
   * chamador (ver `lib/kpi.ts`), porque o formato de comparação varia entre
   * `PeriodComparison` (Dashboard) e `MetricWithComparison` (Analytics). */
  trend?: ReactNode;
  index?: number;
}) {
  return (
    <Card
      hover
      className={`animate-fade-in-up ${size === "primary" ? "p-5" : "p-4"}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center justify-between">
        <p
          className={`flex items-center gap-1 font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
            size === "primary" ? "text-xs" : "text-[0.7rem]"
          }`}
        >
          {label}
          {metricHelpKey && <MetricHelp metric={metricHelpKey} />}
        </p>
        <span
          className={`flex shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400 ${
            size === "primary" ? "h-8 w-8" : "h-7 w-7"
          }`}
        >
          <Icon className={size === "primary" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        </span>
      </div>
      <p
        className={`mt-2 font-semibold tracking-tight text-slate-900 dark:text-slate-50 ${
          size === "primary" ? "text-2xl" : "text-lg"
        }`}
      >
        {value}
      </p>
      {reason && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reason}</p>}
      {trend}
    </Card>
  );
}
