"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { EXECUTIVE_METRIC_OPTIONS, type ExecutiveCorrelation, type TargetMetricKey } from "@/lib/metrics";
import { describeCorrelation } from "@/lib/correlation";
import { sectionTitle, label as labelClass, input as inputClass } from "@/lib/ui";
import { Alert, Card, Skeleton } from "@/components/ui";
import { CorrelationChart } from "@/components/correlation-chart";
import { IconScatter } from "@/components/icons";

function metricLabel(key: TargetMetricKey): string {
  return EXECUTIVE_METRIC_OPTIONS.find((m) => m.key === key)?.label ?? key;
}

function isPercentMetric(key: TargetMetricKey): boolean {
  return EXECUTIVE_METRIC_OPTIONS.find((m) => m.key === key)?.percent ?? false;
}

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
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Não foi possível calcular a correlação.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, dateFrom, dateTo, metricX, metricY]);

  const description = data?.correlation.is_applicable && data.correlation.value !== null
    ? describeCorrelation(data.correlation.value)
    : null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <IconScatter className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Correlação entre métricas</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Compara duas métricas mês a mês no período selecionado acima. Correlação mostra que duas métricas se
        movem juntas — nunca que uma causa a outra.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className={labelClass}>
          Métrica X
          <select
            value={metricX}
            onChange={(e) => setMetricX(e.target.value as TargetMetricKey)}
            className={`${inputClass} w-auto`}
          >
            {EXECUTIVE_METRIC_OPTIONS.map((m) => (
              <option key={m.key} value={m.key} disabled={m.key === metricY}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Métrica Y
          <select
            value={metricY}
            onChange={(e) => setMetricY(e.target.value as TargetMetricKey)}
            className={`${inputClass} w-auto`}
          >
            {EXECUTIVE_METRIC_OPTIONS.map((m) => (
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
                  {description.label} (r = {data.correlation.value!.toLocaleString("pt-BR", { maximumFractionDigits: 2 })})
                </p>
              ) : (
                <p className="text-slate-400">{data.correlation.reason ?? "não aplicável"}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {data.months_used} {data.months_used === 1 ? "mês" : "meses"} com as duas métricas no período.
              </p>
            </div>
          </>
        )
      )}
    </Card>
  );
}
