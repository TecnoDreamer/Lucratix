"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { formatCompactNumber, formatMonthYear } from "@/lib/formatters";
import type { FunnelStageKey, MonthlyFunnelStages } from "@/lib/funnel-metrics";

const HEIGHT = 220;

/**
 * Evolução temporal de UMA etapa do funil ao longo dos meses do intervalo
 * (RF do prompt de funil/gráficos) — Recharts `LineChart`, mesmo critério
 * de "uma métrica por gráfico" já usado em `SeriesChart` (evita legenda de
 * 8 cores simultâneas). Mês sem dado vira um buraco na linha (Recharts não
 * conecta pontos `null` por padrão — RN-003: nunca interpolado como se
 * houvesse continuidade), nunca 0.
 *
 * Acessibilidade: tabela `sr-only` com os mesmos dados, mesmo padrão de
 * `series-chart.tsx` — o gráfico nunca é a única representação.
 */
export function FunnelEvolutionChart({
  points,
  stage,
  label,
}: {
  points: MonthlyFunnelStages[];
  stage: FunnelStageKey;
  label: string;
}) {
  const t = useTranslations("common.funnelEvolutionChart");
  const chartLabel = t("labelWithStage", { stage: label });

  const data = points.map((p) => {
    const metric = p.stages[stage];
    return {
      period: p.period,
      value: metric.is_applicable ? metric.value : null,
    };
  });
  const hasAnyData = data.some((d) => d.value !== null);

  if (!hasAnyData) {
    return (
      <div
        role="img"
        aria-label={t("labelNoData", { chartLabel })}
        className="flex items-center justify-center text-xs text-slate-400 dark:text-slate-600"
        style={{ height: HEIGHT }}
      >
        {t("noData")}
      </div>
    );
  }

  return (
    <div>
      <div role="img" aria-label={chartLabel} style={{ height: HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis
              dataKey="period"
              tickFormatter={(v: string) => formatMonthYear(v)}
              tick={{ fontSize: 10 }}
              className="fill-slate-400 dark:fill-slate-600"
            />
            <YAxis
              tickFormatter={(v: number) => formatCompactNumber(v)}
              width={48}
              tick={{ fontSize: 10 }}
              className="fill-slate-400 dark:fill-slate-600"
            />
            <Tooltip
              labelFormatter={(v) => (typeof v === "string" ? formatMonthYear(v) : "")}
              formatter={(value) => (typeof value === "number" ? formatCompactNumber(value) : t("noDataCell"))}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="currentColor"
              className="text-blue-500 dark:text-blue-400"
              strokeWidth={2}
              dot={{ r: 2.5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{t("tableCaption", { chartLabel })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("month")}</th>
            <th scope="col">{t("value")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.period}>
              <td>{formatMonthYear(d.period)}</td>
              <td>{d.value === null ? t("noDataCell") : formatCompactNumber(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
