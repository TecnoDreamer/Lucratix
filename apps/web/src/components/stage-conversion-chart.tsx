"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { formatMetric, formatPercentChange, type MetricResult } from "@/lib/metrics";
import { formatPercentage } from "@/lib/formatters";
import { findBottleneck } from "@/lib/funnel-insights";
import type { StageConversion, StageConversionWithComparison } from "@/lib/funnel-metrics";
import { tableHead, tableRow } from "@/lib/ui";
import { Card } from "@/components/ui";

const HEIGHT = 220;

function hasComparison(
  conversion: StageConversion | StageConversionWithComparison
): conversion is StageConversionWithComparison {
  return "conversion_rate_comparison" in conversion;
}

/**
 * Conversão e abandono etapa-a-etapa (RF do prompt de funil) — gráfico de
 * barras (Recharts) com a menor taxa aplicável ("gargalo") destacada, mais
 * uma tabela sempre visível (dado primário, não `sr-only` — mesmo critério
 * de `MarketingByChannelTable`: o gráfico é o acompanhamento visual, nunca
 * a única representação).
 */
export function StageConversionChart({
  conversions,
  tFields,
}: {
  conversions: (StageConversion | StageConversionWithComparison)[];
  tFields: (key: string) => string;
}) {
  const t = useTranslations("common.stageConversionChart");
  const tCommon = useTranslations("common");
  const bottleneck = findBottleneck(conversions);

  const chartData = conversions.map((c) => ({
    key: `${c.from_stage}-${c.to_stage}`,
    label: `${tFields(c.from_stage)} → ${tFields(c.to_stage)}`,
    value: c.conversion_rate.is_applicable ? c.conversion_rate.value : null,
    isBottleneck: bottleneck !== null && c.from_stage === bottleneck.from_stage && c.to_stage === bottleneck.to_stage,
  }));
  const hasAnyApplicable = chartData.some((d) => d.value !== null);

  return (
    <div>
      {hasAnyApplicable ? (
        <div role="img" aria-label={t("chartLabel")} style={{ height: HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
              <XAxis
                dataKey="label"
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
                className="fill-slate-500 dark:fill-slate-400"
              />
              <YAxis
                tickFormatter={(v: number) => formatPercentage(v)}
                width={48}
                tick={{ fontSize: 10 }}
                className="fill-slate-500 dark:fill-slate-400"
              />
              <Tooltip
                formatter={(value) => (typeof value === "number" ? formatPercentage(value) : tCommon("notApplicable"))}
              />
              <Bar dataKey="value" fill="currentColor" className="text-blue-500 dark:text-blue-400" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.key}
                    className={entry.isBottleneck ? "text-amber-500 dark:text-amber-400" : undefined}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          role="img"
          aria-label={t("labelNoData")}
          className="flex items-center justify-center text-xs text-slate-400 dark:text-slate-600"
          style={{ height: HEIGHT }}
        >
          {t("noData")}
        </div>
      )}

      {bottleneck && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {t("bottleneckNote", {
            from: tFields(bottleneck.from_stage),
            to: tFields(bottleneck.to_stage),
            value: formatPercentage(bottleneck.conversion_rate.value!),
          })}
        </p>
      )}

      <Card className="mt-3 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className={tableHead}>
              <th className="px-4 py-2.5">{t("transition")}</th>
              <th className="px-4 py-2.5">{t("conversionRate")}</th>
              <th className="px-4 py-2.5">{t("dropOffRate")}</th>
              {hasComparison(conversions[0]) && <th className="px-4 py-2.5">{t("vsPreviousPeriod")}</th>}
            </tr>
          </thead>
          <tbody>
            {conversions.map((c) => (
              <tr key={`${c.from_stage}-${c.to_stage}`} className={tableRow}>
                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                  {tFields(c.from_stage)} → {tFields(c.to_stage)}
                </td>
                <td className="px-4 py-2.5">
                  {formatMetric(c.conversion_rate as MetricResult, { percent: true, notApplicableLabel: tCommon("notApplicable") })}
                </td>
                <td className="px-4 py-2.5">
                  {formatMetric(c.drop_off_rate as MetricResult, { percent: true, notApplicableLabel: tCommon("notApplicable") })}
                </td>
                {hasComparison(c) && (
                  <td className="px-4 py-2.5">
                    {formatPercentChange(c.conversion_rate_comparison, tCommon("notApplicable"))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
