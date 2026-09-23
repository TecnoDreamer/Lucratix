"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { formatCompactNumber, formatMonthYear, formatPercentage } from "@/lib/formatters";
import type { MetricResult } from "@/lib/metrics";

export interface SeriesPoint {
  period: string;
  metric: MetricResult;
}

interface SeriesChartProps {
  points: SeriesPoint[];
  percent?: boolean;
  /** Nome do KPI (ex.: "Receita") — vira o `aria-label` do gráfico e a
   * legenda da tabela alternativa para leitor de tela. Sem isso, todo
   * gráfico da grade soaria idêntico ("Evolução mensal") para quem não
   * enxerga o rótulo visual ao lado. */
  label?: string;
  /** Meta de cada mês, mesma ordem/tamanho de `points` — `null` quando não
   * há meta definida para aquele mês. Desenhada como linha tracejada,
   * mesma lógica de "buraco" da linha de valor real (RN-003: nunca
   * interpolada como se houvesse meta contínua onde não foi definida). */
  targets?: (number | null)[];
}

const WIDTH = 300;
const HEIGHT = 120;
// `left: 30` (era 8) abre espaço pro rótulo de mín/máx do eixo Y — sem
// nenhum valor visível ali, a única forma de saber a ordem de grandeza da
// linha era passar o mouse ponto a ponto (achado 3 da auditoria de
// gráficos, docs/analytics/CHART_DECISIONS.md).
const PADDING = { top: 12, right: 8, bottom: 22, left: 30 };
const INNER_WIDTH = WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
// Acima desse número de pontos, nem todo mês ganha um rótulo no eixo X —
// senão os textos se sobrepõem (ex.: intervalo de 2 anos = 24 pontos).
const MAX_VISIBLE_LABELS = 8;

/** Âncora do rótulo de mês no eixo X — "middle" pros do meio, mas o
 * primeiro/último usam "start"/"end" pra crescer pra dentro do gráfico em
 * vez de pra fora dele. Com `textAnchor="middle"` nas pontas (como era
 * antes), metade do texto cai fora do `viewBox` e é cortada pelo overflow
 * padrão do SVG — o achado 4.2 da auditoria original ("jun/26" virando
 * ".n/26", "ago/26" virando "ago/2"), nunca corrigido até agora. */
function xLabelAnchor(index: number, total: number): "start" | "middle" | "end" {
  if (total <= 1) return "middle";
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "middle";
}

function formatCompactValue(value: number, percent?: boolean): string {
  return percent ? formatPercentage(value) : formatCompactNumber(value);
}

/** Constrói o `d` de um `<path>` de linha a partir de uma série com
 * buracos (`null`) — reaproveitado pela linha de valor real e pela linha
 * de meta, que têm exatamente a mesma regra de continuidade. */
function buildLinePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let path = "";
  let segmentOpen = false;
  values.forEach((v, i) => {
    if (v === null) {
      segmentOpen = false;
      return;
    }
    path += `${segmentOpen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    segmentOpen = true;
  });
  return path;
}

/** Gráfico de linha SVG minimalista, sem dependência externa (mesmo
 * espírito dos ícones em `components/icons.tsx` — ver
 * `docs/analytics/CHART_DECISIONS.md` para a decisão de não adotar uma
 * biblioteca de gráficos nesta rodada) — um ponto por mês, com "buraco"
 * visual (linha interrompida) nos meses sem dado, nunca interpolado como
 * se houvesse continuidade (RN-003).
 *
 * Acessibilidade: o SVG sozinho não é uma representação suficiente (regra
 * do prompt de evolução do Analytics — "gráfico não pode ser a única
 * representação"). Por isso o componente também renderiza uma tabela
 * `sr-only` com os mesmos dados, mês a mês, para quem usa leitor de tela —
 * `<title>` por ponto no SVG cobre só quem consegue apontar o mouse/foco em
 * cada círculo, não uma leitura sequencial normal da página.
 */
export function SeriesChart({ points, percent, label, targets }: SeriesChartProps) {
  const t = useTranslations("common.seriesChart");
  const gradientId = useId();
  const values = points.map((p) => (p.metric.is_applicable ? p.metric.value : null));
  const present = values.filter((v): v is number => v !== null);
  const targetValues = targets ?? points.map(() => null);
  const presentTargets = targetValues.filter((v): v is number => v !== null);
  const chartLabel = label ? t("labelWithMetric", { label }) : t("defaultLabel");

  if (present.length === 0) {
    return (
      <div
        role="img"
        aria-label={t("labelNoData", { chartLabel })}
        className="flex items-center justify-center text-xs text-slate-500 dark:text-slate-400"
        style={{ height: HEIGHT }}
      >
        {t("noData")}
      </div>
    );
  }

  // Meta entra na escala (min/max) pra linha tracejada nunca ficar cortada
  // fora do gráfico quando a meta está acima/abaixo de todo o dado real.
  const allValues = [...present, ...presentTargets];
  const min = Math.min(...allValues);
  const displayMax = Math.max(...allValues);
  // Linha totalmente reta (todos os valores iguais): sem isso a escala
  // colapsaria em range=0 e a divisão abaixo geraria NaN. `max` é só pra
  // escala (nunca aparece na tela) — o rótulo do eixo Y usa `displayMax`,
  // o valor real, não o +1 artificial.
  const max = min === displayMax ? min + 1 : displayMax;
  const range = max - min;

  const x = (i: number) => (points.length === 1 ? WIDTH / 2 : PADDING.left + (i * INNER_WIDTH) / (points.length - 1));
  const y = (v: number) => PADDING.top + INNER_HEIGHT * (1 - (v - min) / range);

  const linePath = buildLinePath(values, x, y);
  const targetPath = presentTargets.length > 0 ? buildLinePath(targetValues, x, y) : "";
  let areaPath = "";
  let segmentOpen = false;
  values.forEach((v, i) => {
    if (v === null) {
      segmentOpen = false;
      return;
    }
    areaPath += segmentOpen
      ? `L${x(i).toFixed(1)},${y(v).toFixed(1)} `
      : `M${x(i).toFixed(1)},${HEIGHT - PADDING.bottom} L${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    segmentOpen = true;
  });

  const labelStep = Math.max(1, Math.ceil(points.length / MAX_VISIBLE_LABELS));

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-28 w-full text-blue-500 dark:text-blue-400"
        role="img"
        aria-label={chartLabel}
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

        {areaPath && (
          <path
            d={`${areaPath}L${x(values.length - 1).toFixed(1)},${HEIGHT - PADDING.bottom} Z`}
            fill={`url(#${gradientId})`}
            stroke="none"
          />
        )}

        {targetPath && (
          <path
            d={targetPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinecap="round"
            className="text-amber-500 dark:text-amber-400"
          >
            <title>{t("target")}</title>
          </path>
        )}

        <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => {
          const v = values[i];
          if (v === null) return null;
          return (
            <circle key={p.period} cx={x(i)} cy={y(v)} r={2.5} fill="currentColor">
              <title>
                {formatMonthYear(p.period)}: {formatCompactValue(v, percent)}
                {targetValues[i] !== null
                  ? ` (${t("targetValue", { value: formatCompactValue(targetValues[i]!, percent) })})`
                  : ""}
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
              textAnchor={xLabelAnchor(i, points.length)}
              className="fill-slate-500 dark:fill-slate-400"
              fontSize={9}
            >
              {formatMonthYear(p.period)}
            </text>
          );
        })}

        {/* Eixo Y: só mín/máx (não uma escala completa — o espaço é
            pequeno demais pra mais de 2 valores sem poluir). Sem isso não
            havia nenhum jeito de saber a ordem de grandeza da linha sem
            passar o mouse ponto a ponto (achado 3 da auditoria). */}
        <text x={2} y={PADDING.top + 3} textAnchor="start" className="fill-slate-500 dark:fill-slate-400" fontSize={9}>
          {formatCompactValue(displayMax, percent)}
        </text>
        {displayMax !== min && (
          <text
            x={2}
            y={HEIGHT - PADDING.bottom}
            textAnchor="start"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize={9}
          >
            {formatCompactValue(min, percent)}
          </text>
        )}
      </svg>

      {presentTargets.length > 0 && (
        <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="14" y2="3" stroke="currentColor" strokeWidth={2} className="text-blue-500 dark:text-blue-400" />
            </svg>
            {t("value")}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="14"
                y2="3"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                className="text-amber-500 dark:text-amber-400"
              />
            </svg>
            {t("target")}
          </span>
        </div>
      )}

      <table className="sr-only">
        <caption>{t("tableCaption", { chartLabel })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("month")}</th>
            <th scope="col">{t("value")}</th>
            {targets && <th scope="col">{t("target")}</th>}
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={p.period}>
              <td>{formatMonthYear(p.period)}</td>
              <td>{values[i] === null ? t("noDataCell") : formatCompactValue(values[i]!, percent)}</td>
              {targets && (
                <td>{targetValues[i] === null ? t("noTarget") : formatCompactValue(targetValues[i]!, percent)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
