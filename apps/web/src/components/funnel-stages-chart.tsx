"use client";

import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslations } from "next-intl";
import { formatCompactNumber } from "@/lib/formatters";
import { FUNNEL_STAGE_KEYS, type FunnelStages } from "@/lib/funnel-metrics";

const HEIGHT = 260;
// Mesma cor (azul) do restante dos gráficos do produto (SeriesChart),
// variando só a opacidade por etapa — não é um "ranking" de cor por etapa,
// só ajuda a distinguir uma faixa da seguinte no funil.
const FILL_OPACITY_STEP = 1 / FUNNEL_STAGE_KEYS.length;

/**
 * Visualização em funil das 8 etapas (Recharts `FunnelChart`) — RF do
 * prompt de funil/gráficos. Etapas sem dado nunca viram 0 (RN-003): o
 * funil é desenhado só com a sequência de etapas aplicáveis a partir da
 * primeira (um funil com "buraco" no meio não é uma forma visual honesta —
 * ao contrário de uma série temporal, aqui não há como representar uma
 * etapa ausente sem ela virar, visualmente, "zero pessoas").
 *
 * Acessibilidade: gráfico nunca é a única representação (ver
 * `docs/analytics/CHART_DECISIONS.md`) — tabela `sr-only` com os mesmos
 * dados, mesmo padrão de `series-chart.tsx`.
 */
export function FunnelStagesChart({ stages, label }: { stages: FunnelStages; label?: string }) {
  const t = useTranslations("common.funnelStagesChart");
  const tFields = useTranslations("funnel.fields");
  const chartLabel = label ? t("labelWithChannel", { label }) : t("defaultLabel");

  const applicableStages = [];
  for (const key of FUNNEL_STAGE_KEYS) {
    const stage = stages[key];
    if (!stage.is_applicable || stage.value === null) break;
    applicableStages.push({ key, value: stage.value });
  }

  if (applicableStages.length === 0) {
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

  const data = applicableStages.map((s, i) => ({
    name: tFields(s.key),
    value: s.value,
    fillOpacity: 1 - i * FILL_OPACITY_STEP * 0.6,
  }));

  return (
    <div>
      <div role="img" aria-label={chartLabel} style={{ height: HEIGHT }} className="text-blue-500 dark:text-blue-400">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip formatter={(value) => (typeof value === "number" ? formatCompactNumber(value) : value)} />
            <Funnel dataKey="value" data={data} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.name} fill="currentColor" fillOpacity={entry.fillOpacity} />
              ))}
              <LabelList
                dataKey="name"
                position="right"
                className="fill-slate-700 dark:fill-slate-300"
                fontSize={11}
              />
              <LabelList
                dataKey="value"
                position="center"
                fill="#fff"
                fontSize={11}
                formatter={(value) => (typeof value === "number" ? formatCompactNumber(value) : value)}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{t("tableCaption", { chartLabel })}</caption>
        <thead>
          <tr>
            <th scope="col">{t("stage")}</th>
            <th scope="col">{t("value")}</th>
          </tr>
        </thead>
        <tbody>
          {applicableStages.map((s) => (
            <tr key={s.key}>
              <td>{tFields(s.key)}</td>
              <td>{formatCompactNumber(s.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
