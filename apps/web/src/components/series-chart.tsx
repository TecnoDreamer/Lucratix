"use client";

import { useId } from "react";
import type { MetricResult } from "@/lib/metrics";

export interface SeriesPoint {
  period: string;
  metric: MetricResult;
}

interface SeriesChartProps {
  points: SeriesPoint[];
  percent?: boolean;
}

const WIDTH = 300;
const HEIGHT = 120;
const PADDING = { top: 12, right: 8, bottom: 22, left: 8 };
const INNER_WIDTH = WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
// Acima desse número de pontos, nem todo mês ganha um rótulo no eixo X —
// senão os textos se sobrepõem (ex.: intervalo de 2 anos = 24 pontos).
const MAX_VISIBLE_LABELS = 8;

// "toLocaleDateString('pt-BR', {month:'short', year:'2-digit'})" devolve
// "jul. de 26" (verboso demais para rótulo de eixo) — abreviação fixa em
// vez de depender do formato de locale por extenso.
const MONTH_ABBREVIATIONS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2026-06-01" -> "jun/26". Parseado por índice de string (não `new
 * Date(...)`) para não sofrer deslocamento de fuso horário. */
function formatMonthLabel(period: string): string {
  const year = period.slice(2, 4);
  const monthIndex = Number(period.slice(5, 7)) - 1;
  return `${MONTH_ABBREVIATIONS[monthIndex] ?? "?"}/${year}`;
}

function formatCompactValue(value: number, percent?: boolean): string {
  if (percent) {
    return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  return value.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
}

/** Gráfico de linha SVG minimalista, sem dependência externa (mesmo
 * espírito dos ícones em `components/icons.tsx`) — um ponto por mês, com
 * "buraco" visual (linha interrompida) nos meses sem dado, nunca
 * interpolado como se houvesse continuidade (RN-003). */
export function SeriesChart({ points, percent }: SeriesChartProps) {
  const gradientId = useId();
  const values = points.map((p) => (p.metric.is_applicable ? p.metric.value : null));
  const present = values.filter((v): v is number => v !== null);

  if (present.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 dark:text-slate-600"
        style={{ height: HEIGHT }}
      >
        Sem dados suficientes no período.
      </div>
    );
  }

  const min = Math.min(...present);
  const rawMax = Math.max(...present);
  // Linha totalmente reta (todos os valores iguais): sem isso a escala
  // colapsaria em range=0 e a divisão abaixo geraria NaN.
  const max = min === rawMax ? min + 1 : rawMax;
  const range = max - min;

  const x = (i: number) => (points.length === 1 ? WIDTH / 2 : PADDING.left + (i * INNER_WIDTH) / (points.length - 1));
  const y = (v: number) => PADDING.top + INNER_HEIGHT * (1 - (v - min) / range);

  let linePath = "";
  let areaPath = "";
  let segmentOpen = false;
  values.forEach((v, i) => {
    if (v === null) {
      segmentOpen = false;
      return;
    }
    const cmd = segmentOpen ? "L" : "M";
    linePath += `${cmd}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    areaPath += segmentOpen
      ? `L${x(i).toFixed(1)},${y(v).toFixed(1)} `
      : `M${x(i).toFixed(1)},${HEIGHT - PADDING.bottom} L${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    segmentOpen = true;
  });

  const labelStep = Math.max(1, Math.ceil(points.length / MAX_VISIBLE_LABELS));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-28 w-full text-blue-500 dark:text-blue-400"
      role="img"
      aria-label="Evolução mensal"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line
        x1={PADDING.left}
        y1={HEIGHT - PADDING.bottom}
        x2={WIDTH - PADDING.right}
        y2={HEIGHT - PADDING.bottom}
        className="stroke-slate-200 dark:stroke-slate-800"
        strokeWidth={1}
      />

      {areaPath && <path d={`${areaPath}L${x(values.length - 1).toFixed(1)},${HEIGHT - PADDING.bottom} Z`} fill={`url(#${gradientId})`} stroke="none" />}
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => {
        const v = values[i];
        if (v === null) return null;
        return (
          <circle key={p.period} cx={x(i)} cy={y(v)} r={2.5} fill="currentColor">
            <title>
              {formatMonthLabel(p.period)}: {formatCompactValue(v, percent)}
            </title>
          </circle>
        );
      })}

      {points.map((p, i) => {
        if (i % labelStep !== 0 && i !== points.length - 1) return null;
        return (
          <text
            key={p.period}
            x={x(i)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-slate-400 dark:fill-slate-600"
            fontSize={9}
          >
            {formatMonthLabel(p.period)}
          </text>
        );
      })}
    </svg>
  );
}
