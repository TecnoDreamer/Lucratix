"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { ChartTooltip } from "@/components/chart-tooltip";

const HEIGHT = 220;

export interface ChannelBarChartDatum {
  key: string;
  label: string;
  value: number | null;
}

/**
 * Gráfico de barras genérico (Recharts) para comparar uma métrica entre
 * categorias (ex.: canal, campanha) — PR4 ("adoção do padrão de gráfico em
 * outras telas"). Ao contrário dos gráficos do Funil (`FunnelStagesChart`/
 * `StageConversionChart`/...), acoplados ao domínio do funil (ver
 * docs/analytics/CHART_DECISIONS.md), este componente não conhece nada além
 * de `{key,label,value}[]` — a primeira tela a usar é Marketing (ROAS por
 * canal), mas serve qualquer comparação futura de métrica por categoria.
 *
 * A barra do maior valor aplicável vem destacada (mesmo padrão visual de
 * `StageConversionChart`, que destaca o gargalo) — aqui sempre "melhor"
 * (maior valor), nunca linguagem causal: a interpretação do texto de apoio
 * é responsabilidade da tela que usa o componente, não dele.
 */
export function ChannelBarChart({
  data,
  valueFormatter,
  label,
}: {
  data: ChannelBarChartDatum[];
  valueFormatter: (value: number) => string;
  label: string;
}) {
  const t = useTranslations("common.channelBarChart");
  const applicable = data.filter((d): d is ChannelBarChartDatum & { value: number } => d.value !== null);

  if (applicable.length === 0) {
    return (
      <div
        role="img"
        aria-label={label}
        className="flex items-center justify-center text-xs text-slate-500 dark:text-slate-400"
        style={{ height: HEIGHT }}
      >
        {t("noData")}
      </div>
    );
  }

  const bestValue = Math.max(...applicable.map((d) => d.value));

  return (
    <div role="img" aria-label={label} style={{ height: HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 32 }}>
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
            tickFormatter={(v: number) => valueFormatter(v)}
            width={48}
            tick={{ fontSize: 10 }}
            className="fill-slate-500 dark:fill-slate-400"
          />
          <Tooltip
            content={({ active, payload }) => (
              <ChartTooltip
                active={active}
                title={payload?.[0]?.payload?.label}
                items={[
                  {
                    label,
                    value:
                      typeof payload?.[0]?.value === "number"
                        ? valueFormatter(payload[0].value)
                        : t("noDataPoint"),
                  },
                ]}
              />
            )}
          />
          <Bar
            dataKey="value"
            fill="currentColor"
            className="text-blue-500 dark:text-blue-400"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                className={entry.value === bestValue ? "text-emerald-500 dark:text-emerald-400" : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
