"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { useExecutiveMetricOptions, type ExecutiveCorrelation, type TargetMetricKey } from "@/lib/metrics";
import { describeCorrelation, type CorrelationStrength } from "@/lib/correlation";
import { sectionTitle, label as labelClass, input as inputClass } from "@/lib/ui";
import { Alert, Card, Skeleton } from "@/components/ui";
import { CorrelationChart } from "@/components/correlation-chart";
import { IconScatter } from "@/components/icons";

// describeCorrelation (lib/correlation.ts) é puro/testado em pt-BR (ver
// correlation.spec.ts) — mapeia sua força para a chave de tradução em vez
// de usar `.label` diretamente, sem alterar a função nem o teste existente.
const STRENGTH_KEY: Record<CorrelationStrength, string> = {
  forte: "strong",
  moderada: "moderate",
  fraca: "weak",
  "muito fraca": "veryWeak",
};

/** Correlação de Pearson entre duas métricas mensais da Visão Executiva —
 * não depende de dado novo, reaproveita a mesma série mensal do gráfico de
 * evolução, só com outro eixo de leitura. Busca própria (não faz parte do
 * Promise.all da página) porque tem duas variáveis a mais (metricX/metricY)
 * que nenhum outro painel da página precisa. */
export function CorrelationPanel({
  organizationId,
  dateFrom,
  dateTo,
}: {
  organizationId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const t = useTranslations("analytics.correlationPanel");
  const tCommon = useTranslations("common");
  const metricOptions = useExecutiveMetricOptions();
  const metricLabel = (key: TargetMetricKey) => metricOptions.find((m) => m.key === key)?.label ?? key;
  const isPercentMetric = (key: TargetMetricKey) => metricOptions.find((m) => m.key === key)?.percent ?? false;

  const [metricX, setMetricX] = useState<TargetMetricKey>("revenue");
  const [metricY, setMetricY] = useState<TargetMetricKey>("cac");
  const [data, setData] = useState<ExecutiveCorrelation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });
    api
      .get<ExecutiveCorrelation>(
        `/api/v1/organizations/${organizationId}/analytics/executive/correlation?date_from=${dateFrom}&date_to=${dateTo}&metric_x=${metricX}&metric_y=${metricY}`
      )
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t("genericError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // t (tradutor) omitido de propósito: nunca é referencialmente estável
    // entre renders, incluí-lo aqui quebraria a memoização deste efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, dateFrom, dateTo, metricX, metricY]);

  const description = data?.correlation.is_applicable && data.correlation.value !== null
    ? describeCorrelation(data.correlation.value)
    : null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <IconScatter className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className={labelClass}>
          {t("metricX")}
          <select
            value={metricX}
            onChange={(e) => setMetricX(e.target.value as TargetMetricKey)}
            className={`${inputClass} w-auto`}
          >
            {metricOptions.map((m) => (
              <option key={m.key} value={m.key} disabled={m.key === metricY}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t("metricY")}
          <select
            value={metricY}
            onChange={(e) => setMetricY(e.target.value as TargetMetricKey)}
            className={`${inputClass} w-auto`}
          >
            {metricOptions.map((m) => (
              <option key={m.key} value={m.key} disabled={m.key === metricX}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <Skeleton className="mt-4 h-56 w-full" />
      ) : (
        data && (
          <>
            <div className="mt-4">
              <CorrelationChart
                points={data.points}
                xLabel={metricLabel(metricX)}
                yLabel={metricLabel(metricY)}
                xPercent={isPercentMetric(metricX)}
                yPercent={isPercentMetric(metricY)}
              />
            </div>
            <div className="mt-3 text-sm">
              {description ? (
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {description.direction
                    ? t("correlationLabel", {
                        strength: t(`strength.${STRENGTH_KEY[description.strength]}`),
                        direction: t(`direction.${description.direction === "positiva" ? "positive" : "negative"}`),
                      })
                    : t("noCorrelation")}{" "}
                  (r = {data.correlation.value!.toLocaleString("pt-BR", { maximumFractionDigits: 2 })})
                </p>
              ) : (
                // reason vem do backend (fora do escopo de tradução desta PR — ver ADR-0009);
                // só o fallback "não aplicável" é cópia autoral do frontend.
                <p className="text-slate-500 dark:text-slate-400">{data.correlation.reason ?? tCommon("notApplicable")}</p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("monthsUsed", { count: data.months_used })}</p>
            </div>
          </>
        )
      )}
    </Card>
  );
}
