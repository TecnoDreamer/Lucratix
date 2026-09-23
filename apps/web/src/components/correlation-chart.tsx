"use client";

import { useTranslations } from "next-intl";
import { formatCompactNumber, formatMonthYear, formatPercentage } from "@/lib/formatters";
import type { CorrelationPoint } from "@/lib/metrics";

interface CorrelationChartProps {
  points: CorrelationPoint[];
  xLabel: string;
  yLabel: string;
  xPercent?: boolean;
  yPercent?: boolean;
}

const WIDTH = 320;
const HEIGHT = 220;
const PADDING = { top: 12, right: 12, bottom: 34, left: 12 };
const INNER_WIDTH = WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

function formatAxisValue(value: number, percent?: boolean): string {
  return percent ? formatPercentage(value) : formatCompactNumber(value);
}

/** Gráfico de dispersão SVG minimalista, mesma convenção artesanal de
 * `series-chart.tsx` (sem biblioteca — ver `docs/analytics/CHART_DECISIONS.md`).
 * Só plota meses com as duas métricas presentes (um ponto sem uma das duas
 * coordenadas não tem onde desenhar); os meses sem par continuam na tabela
 * `sr-only`, marcados "sem dado" — nunca silenciosamente descartados.
 */
export function CorrelationChart({ points, xLabel, yLabel, xPercent, yPercent }: CorrelationChartProps) {
  const t = useTranslations("analytics.correlationChart");
  const present = points.filter(
    (p): p is { period: string; x: number; y: number } => p.x !== null && p.y !== null
  );
  const chartLabel = t("scatterLabel", { xLabel, yLabel });

  if (present.length === 0) {
    return (
      <div
        role="img"
        aria-label={t("scatterLabelNoData", { chartLabel })}
        className="flex items-center justify-center text-xs text-slate-500 dark:text-slate-400"
        style={{ height: HEIGHT }}
      >
        {t("noMonths")}
      </div>
    );
  }

  const xs = present.map((p) => p.x);
  const ys = present.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xRawMax = Math.max(...xs);
  const xMax = xMin === xRawMax ? xMin + 1 : xRawMax;
  const yMin = Math.min(...ys);
  const yRawMax = Math.max(...ys);
  const yMax = yMin === yRawMax ? yMin + 1 : yRawMax;

  const sx = (v: number) => PADDING.left + ((v - xMin) / (xMax - xMin)) * INNER_WIDTH;
  const sy = (v: number) => PADDING.top + INNER_HEIGHT * (1 - (v - yMin) / (yMax - yMin));

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-56 w-full text-blue-500 dark:text-blue-400"
        role="img"
        aria-label={chartLabel}
      >
        <line
          x1={PADDING.left}
          y1={HEIGHT - PADDING.bottom}
          x2={WIDTH - PADDING.right}
          y2={HEIGHT - PADDING.bottom}
          className="stroke-slate-200 dark:stroke-slate-800"
          strokeWidth={1}
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={HEIGHT - PADDING.bottom}
          className="stroke-slate-200 dark:stroke-slate-800"
          strokeWidth={1}
        />

        {present.map((p) => (
          <circle key={p.period} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill="currentColor" fillOpacity={0.7}>
            <title>
              {formatMonthYear(p.period)}: {xLabel} {formatAxisValue(p.x, xPercent)}, {yLabel}{" "}
              {formatAxisValue(p.y, yPercent)}
            </title>
          </circle>
        ))}

        <text x={PADDING.left} y={HEIGHT - PADDING.bottom + 14} fontSize={9} className="fill-slate-500 dark:fill-slate-400">
          {formatAxisValue(xMin, xPercent)}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - PADDING.bottom + 14}
          textAnchor="end"
          fontSize={9}
          className="fill-slate-500 dark:fill-slate-400"
        >
          {formatAxisValue(xMax, xPercent)}
        </text>
        <text x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={10} className="fill-slate-500 dark:fill-slate-400">
          {xLabel}
        </text>
        <text
          x={PADDING.left + 4}
          y={PADDING.top + 10}
          fontSize={10}
          className="fill-slate-500 dark:fill-slate-400"
        >
          {yLabel} ↑
        </text>
      </svg>

      <table className="sr-only">
        <caption>{t("tableCaption", { chartLabel })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("month")}</th>
            <th scope="col">{xLabel}</th>
            <th scope="col">{yLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.period}>
              <td>{formatMonthYear(p.period)}</td>
              <td>{p.x === null ? t("noData") : formatAxisValue(p.x, xPercent)}</td>
              <td>{p.y === null ? t("noData") : formatAxisValue(p.y, yPercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
