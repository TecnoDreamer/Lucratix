"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { useExecutiveMetricOptions, type Target, type TargetMetricKey } from "@/lib/metrics";
import { formatCompactNumber, formatMonthYear, formatPercentage } from "@/lib/formatters";
import { buttonGhost, buttonPrimary, input as inputClass, label as labelClass, sectionTitle } from "@/lib/ui";
import { Alert, Card } from "@/components/ui";
import { IconTarget, IconTrash } from "@/components/icons";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Definir/editar/remover metas por KPI/mês. Vive na página de Analytics,
 * que já exige ANALYST+ pra ser alcançada (RN-010) — sem gate extra de
 * papel aqui, diferente da Central de Dados (que é visível pro VIEWER
 * também e por isso esconde só o formulário). O backend ainda exige
 * ANALYST+ em PUT/DELETE independente disso. */
export function TargetsPanel({
  organizationId,
  onSaved,
}: {
  organizationId: string;
  /** Chamado depois de criar/atualizar/remover uma meta com sucesso — a
   * página de Analytics usa isso pra re-buscar o progresso agregado (cards
   * + linha do gráfico), que não atualizaria sozinho até o período mudar. */
  onSaved?: () => void;
}) {
  const t = useTranslations("analytics.targetsPanel");
  const metricOptions = useExecutiveMetricOptions();
  const metricLabel = (key: TargetMetricKey) => metricOptions.find((m) => m.key === key)?.label ?? key;
  const isPercentMetric = (key: TargetMetricKey) => metricOptions.find((m) => m.key === key)?.percent ?? false;

  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metric, setMetric] = useState<TargetMetricKey>("revenue");
  const [month, setMonth] = useState(currentMonthValue());
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  function loadTargets() {
    return api.get<Target[]>(`/api/v1/organizations/${organizationId}/targets`);
  }

  useEffect(() => {
    let cancelled = false;
    loadTargets()
      .then((result) => {
        if (!cancelled) setTargets(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t("loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const numeric = Number(value.replace(",", "."));
    if (!value || Number.isNaN(numeric)) {
      setError(t("invalidValue"));
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/v1/organizations/${organizationId}/targets`, {
        metric,
        period: `${month}-01`,
        value: isPercentMetric(metric) ? numeric / 100 : numeric,
      });
      setTargets(await loadTargets());
      setValue("");
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(targetId: string) {
    setError(null);
    try {
      await api.del(`/api/v1/organizations/${organizationId}/targets/${targetId}`);
      setTargets((prev) => prev.filter((existing) => existing.id !== targetId));
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("deleteError"));
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <IconTarget className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 flex flex-wrap items-end gap-3">
        <label className={labelClass}>
          {t("metric")}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as TargetMetricKey)}
            className={`${inputClass} w-auto`}
          >
            {metricOptions.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t("month")}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={`${inputClass} w-auto`}
          />
        </label>
        <label className={labelClass}>
          {t("target")} {isPercentMetric(metric) ? "(%)" : ""}
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isPercentMetric(metric) ? "40" : "50000"}
            className={`${inputClass} w-32`}
          />
        </label>
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? t("saving") : t("save")}
        </button>
      </form>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-slate-400">{t("loading")}</p>
        ) : targets.length === 0 ? (
          <p className="text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {targets.map((tgt) => (
              <li
                key={tgt.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
              >
                <span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{metricLabel(tgt.metric)}</span>
                  <span className="text-slate-400"> · {formatMonthYear(tgt.period)} · </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {isPercentMetric(tgt.metric) ? formatPercentage(tgt.value) : formatCompactNumber(tgt.value)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(tgt.id)}
                  aria-label={t("removeAriaLabel", {
                    metric: metricLabel(tgt.metric),
                    period: formatMonthYear(tgt.period),
                  })}
                  className={`${buttonGhost} px-2 py-1`}
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
