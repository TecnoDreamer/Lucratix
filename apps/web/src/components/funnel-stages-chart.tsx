"use client";

import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslations } from "next-intl";
import { formatCompactNumber, formatPercentage } from "@/lib/formatters";
import { FUNNEL_STAGE_KEYS, type FunnelStages, type StageConversion } from "@/lib/funnel-metrics";
import { ChartTooltip } from "@/components/chart-tooltip";

const HEIGHT = 260;
// Reserva espaço à direita do funil pro label externo (conector + duas
// linhas de texto) — sem isso, a etapa mais larga (normalmente a
// primeira) ocupa quase 100% da largura do container, e o label dela
// simplesmente não cabe (fica fora da área visível do SVG). Dimensionado
// pro maior texto que este layout pode produzir ("Oportunidades · 500 mil
// · 10% de Visitas"), não calibrado pro dataset atual — funciona igual
// com qualquer combinação de valores.
const LABEL_AREA_WIDTH = 190;
// Mesma cor (azul) do restante dos gráficos do produto (SeriesChart),
// variando só a opacidade por etapa — não é um "ranking" de cor por etapa,
// só ajuda a distinguir uma faixa da seguinte no funil.
const FILL_OPACITY_STEP = 1 / FUNNEL_STAGE_KEYS.length;

interface StageLabelDatum {
  name: string;
  value: number;
  /** Conversão em relação à etapa anterior (ex.: "8,1% das visitas") — já
   * calculada pelo backend (`analytics.conversions`), nunca recomputada
   * aqui (fonte única, ver docs/analytics/CHART_DECISIONS.md). Ausente na
   * primeira etapa aplicável (não há "anterior") ou quando o backend não
   * fornece a conversão daquele par. */
  conversionLabel: string | null;
}

/** Monta nome + conversão-em-relação-à-anterior por etapa aplicável —
 * função pura (sem hooks), extraída pra ser testável direto sem precisar
 * simular o layout real do Recharts em jsdom (que não mede geometria sem
 * um `ResizeObserver` de verdade — mesma razão de `buildConversionTooltipItems`
 * em `stage-conversion-chart.tsx`). `t`/`tFields` recebidos como parâmetros
 * (não hooks) para poder chamar isto fora de um componente React. */
export function buildStageLabelData(
  applicableStages: { key: string; value: number }[],
  conversions: StageConversion[] | undefined,
  t: (key: string, values?: Record<string, string>) => string,
  tFields: (key: string) => string
): StageLabelDatum[] {
  const conversionByPair = new Map<string, number>();
  for (const c of conversions ?? []) {
    if (c.conversion_rate.is_applicable && c.conversion_rate.value !== null) {
      conversionByPair.set(`${c.from_stage}-${c.to_stage}`, c.conversion_rate.value);
    }
  }

  return applicableStages.map((s, i) => {
    const previous = applicableStages[i - 1];
    const rate = previous ? conversionByPair.get(`${previous.key}-${s.key}`) : undefined;
    return {
      name: tFields(s.key),
      value: s.value,
      conversionLabel:
        rate !== undefined
          ? t("conversionOfPrevious", { rate: formatPercentage(rate), previous: tFields(previous!.key) })
          : null,
    };
  });
}

/** `content` customizado do `LabelList` — desenha nome + valor + conversão
 * num único bloco de texto à direita do trapézio, ligado por um conector
 * discreto. Substitui os dois `LabelList` antigos (nome à direita, valor
 * em branco NO CENTRO do trapézio — ilegível em etapas estreitas). `x`,
 * `y`, `width`, `height` vêm do próprio layout do Recharts para aquela
 * etapa — nunca coordenada fixa, robusto a qualquer diferença de escala
 * entre etapas (RF: "10.000.000 → ... → 1" não pode quebrar o layout).
 */
function ExternalStageLabel(props: {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  index?: number;
  data: StageLabelDatum[];
}) {
  const x = Number(props.x);
  const y = Number(props.y);
  const width = Number(props.width);
  const height = Number(props.height);
  const { index, data } = props;
  if ([x, y, width, height].some((n) => Number.isNaN(n)) || index === undefined) {
    return null;
  }
  const stage = data[index];
  if (!stage) return null;

  const rightEdge = x + width;
  const connectorEnd = rightEdge + 10;
  const textX = connectorEnd + 6;
  const centerY = y + height / 2;
  const detail = stage.conversionLabel
    ? `${formatCompactNumber(stage.value)} · ${stage.conversionLabel}`
    : formatCompactNumber(stage.value);

  return (
    <g>
      <line
        x1={rightEdge}
        y1={centerY}
        x2={connectorEnd}
        y2={centerY}
        className="stroke-slate-300 dark:stroke-slate-700"
        strokeWidth={1}
      />
      <text
        x={textX}
        y={centerY}
        dy={-3}
        textAnchor="start"
        className="fill-slate-700 text-[11px] font-medium dark:fill-slate-300"
      >
        {stage.name}
      </text>
      <text
        x={textX}
        y={centerY}
        dy={11}
        textAnchor="start"
        className="fill-slate-500 text-[10px] dark:fill-slate-500"
      >
        {detail}
      </text>
    </g>
  );
}

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
export function FunnelStagesChart({
  stages,
  conversions,
  label,
}: {
  stages: FunnelStages;
  conversions?: StageConversion[];
  label?: string;
}) {
  const t = useTranslations("common.funnelStagesChart");
  const tFields = useTranslations("funnel.fields");
  const chartLabel = label ? t("labelWithChannel", { label }) : t("defaultLabel");

  const applicableStages: { key: (typeof FUNNEL_STAGE_KEYS)[number]; value: number }[] = [];
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

  // Conversao em relacao a etapa anterior, na mesma fonte que
  // StageConversionChart ja usa (analytics.conversions) — nunca recalculada.
  const labelData = buildStageLabelData(applicableStages, conversions, t, tFields);

  const data = applicableStages.map((s, i) => ({
    name: tFields(s.key),
    value: s.value,
    fillOpacity: 1 - i * FILL_OPACITY_STEP * 0.6,
  }));

  return (
    <div>
      <div role="img" aria-label={chartLabel} style={{ height: HEIGHT }} className="text-blue-500 dark:text-blue-400">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart margin={{ top: 8, right: LABEL_AREA_WIDTH, bottom: 8, left: 8 }}>
            <Tooltip
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  title={payload?.[0]?.payload?.name}
                  items={
                    payload?.[0]?.value !== undefined
                      ? [{ label: t("value"), value: formatCompactNumber(Number(payload[0].value)) }]
                      : []
                  }
                />
              )}
            />
            <Funnel dataKey="value" data={data} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.name} fill="currentColor" fillOpacity={entry.fillOpacity} />
              ))}
              <LabelList
                dataKey="name"
                position="right"
                content={(props) => <ExternalStageLabel {...props} data={labelData} />}
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
