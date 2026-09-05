"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { formatMetric, formatPercentChange, type MetricResult } from "@/lib/metrics";
import { formatInteger, formatPercentage } from "@/lib/formatters";
import { findBottleneck } from "@/lib/funnel-insights";
import type { FunnelStages, StageConversion, StageConversionWithComparison } from "@/lib/funnel-metrics";
import { tableHead, tableRow } from "@/lib/ui";
import { Card } from "@/components/ui";
import { ChartTooltip, type ChartTooltipItem } from "@/components/chart-tooltip";

const MIN_HEIGHT = 220;
const HEIGHT_PER_ROW = 44;
// Espaço reservado pro nome da transição no eixo (categoria), largo o
// bastante pra "Oportunidades → Clientes" sem cortar — nomes inclinados
// (o problema original) deixam de existir com o layout horizontal.
const CATEGORY_AXIS_WIDTH = 150;

function hasComparison(
  conversion: StageConversion | StageConversionWithComparison
): conversion is StageConversionWithComparison {
  return "conversion_rate_comparison" in conversion;
}

interface ConversionRow {
  from: string;
  to: string;
  value: number | null;
  dropOff: MetricResult;
}

/** Monta os itens do tooltip rico (seção 4 do prompt de redesign do Funil:
 * taxa, valores absolutos das duas etapas e "Perda") — extraída como
 * função pura (não usa hooks) para ser testável direto, sem precisar
 * simular hover num gráfico Recharts em jsdom (frágil e não é o padrão já
 * usado pelos outros testes de gráfico deste projeto, que verificam a
 * tabela sempre visível/`sr-only`, não o SVG renderizado).
 *
 * "Perda" é só `stages[from] - stages[to]` — os mesmos dois valores já
 * buscados por `GET /analytics/funnel`, nunca uma fórmula nova (seção 15:
 * fonte única de dados). Sem `stages` (ou com alguma das duas etapas não
 * aplicável), os itens de contagem/perda ficam de fora — o tooltip ainda
 * mostra taxa de conversão/abandono normalmente. */
export function buildConversionTooltipItems(
  row: ConversionRow,
  stages: FunnelStages | undefined,
  t: (key: string) => string,
  tFields: (key: string) => string,
  notApplicableLabel: string
): ChartTooltipItem[] {
  const items: ChartTooltipItem[] = [
    {
      label: t("conversionRate"),
      value: row.value !== null ? formatPercentage(row.value) : notApplicableLabel,
    },
  ];
  const fromStage = stages?.[row.from as keyof FunnelStages];
  const toStage = stages?.[row.to as keyof FunnelStages];
  if (fromStage?.is_applicable && fromStage.value !== null && toStage?.is_applicable && toStage.value !== null) {
    items.push(
      { label: tFields(row.from), value: formatInteger(fromStage.value) },
      { label: tFields(row.to), value: formatInteger(toStage.value) },
      { label: t("loss"), value: formatInteger(fromStage.value - toStage.value), tone: "warning" }
    );
  }
  items.push({
    label: t("dropOffRate"),
    value: row.dropOff.is_applicable && row.dropOff.value !== null ? formatPercentage(row.dropOff.value) : notApplicableLabel,
    tone: "warning",
  });
  return items;
}

/**
 * Conversão e abandono etapa-a-etapa (RF do prompt de funil) — barras
 * HORIZONTAIS (Recharts `BarChart` com `layout="vertical"`): nomes de
 * transição por extenso no eixo, sem inclinação (o layout vertical antigo
 * cortava/inclinava nomes como "Oportunidades → Clientes"). A menor taxa
 * aplicável ("gargalo") vem destacada, mais uma tabela sempre visível
 * (dado primário, não `sr-only` — mesmo critério de `MarketingByChannelTable`:
 * o gráfico é o acompanhamento visual, nunca a única representação).
 */
export function StageConversionChart({
  conversions,
  stages,
  tFields,
}: {
  conversions: (StageConversion | StageConversionWithComparison)[];
  /** Valores absolutos de cada etapa (`analytics.stages`) — opcional: sem
   * isso o tooltip mostra só taxa/abandono (não dá pra calcular "Perda"
   * sem os dois valores absolutos). Nunca uma fórmula nova: "Perda" é só
   * `stages[from] - stages[to]`, os mesmos números já buscados. */
  stages?: FunnelStages;
  tFields: (key: string) => string;
}) {
  const t = useTranslations("common.stageConversionChart");
  const tCommon = useTranslations("common");
  const bottleneck = findBottleneck(conversions);

  const chartData = conversions.map((c) => ({
    key: `${c.from_stage}-${c.to_stage}`,
    from: c.from_stage,
    to: c.to_stage,
    label: `${tFields(c.from_stage)} → ${tFields(c.to_stage)}`,
    value: c.conversion_rate.is_applicable ? c.conversion_rate.value : null,
    dropOff: c.drop_off_rate,
    isBottleneck: bottleneck !== null && c.from_stage === bottleneck.from_stage && c.to_stage === bottleneck.to_stage,
  }));
  const hasAnyApplicable = chartData.some((d) => d.value !== null);
  const height = Math.max(MIN_HEIGHT, chartData.length * HEIGHT_PER_ROW);
  const notApplicableLabel = tCommon("notApplicable");

  return (
    <div>
      {hasAnyApplicable ? (
        <div role="img" aria-label={t("chartLabel")} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatPercentage(v)}
                tick={{ fontSize: 10 }}
                className="fill-slate-500 dark:fill-slate-400"
              />
              <YAxis
                type="category"
                dataKey="label"
                width={CATEGORY_AXIS_WIDTH}
                tick={{ fontSize: 11 }}
                className="fill-slate-600 dark:fill-slate-300"
              />
              <Tooltip
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                  return (
                    <ChartTooltip
                      active={active}
                      title={row?.label}
                      items={row ? buildConversionTooltipItems(row, stages, t, tFields, notApplicableLabel) : []}
                    />
                  );
                }}
              />
              <Bar
                dataKey="value"
                fill="currentColor"
                className="text-blue-500 dark:text-blue-400"
                radius={[0, 3, 3, 0]}
                isAnimationActive={false}
              >
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
          style={{ height: MIN_HEIGHT }}
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
