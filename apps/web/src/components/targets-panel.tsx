"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Target, TargetMetricKey } from "@/lib/metrics";
import { formatCompactNumber, formatMonthYear, formatPercentage } from "@/lib/formatters";
import { buttonGhost, buttonPrimary, input as inputClass, label as labelClass, sectionTitle } from "@/lib/ui";
import { Alert, Card } from "@/components/ui";
import { IconTarget, IconTrash } from "@/components/icons";

// Mesmos 7 KPIs de CARDS em analytics/page.tsx — lista pequena e estável,
// duplicada aqui deliberadamente (é configuração de rótulo/apresentação,
// não fórmula de negócio; a fórmula de verdade continua só no backend).
const TARGET_METRICS: { key: TargetMetricKey; label: string; percent?: boolean }[] = [
  { key: "revenue", label: "Receita" },
  { key: "profit", label: "Lucro" },
  { key: "margin", label: "Margem", percent: true },
  { key: "cac", label: "CAC" },
  { key: "conversion_rate", label: "Conversão", percent: true },
  { key: "average_ticket", label: "Ticket médio" },
  { key: "recurrence_rate", label: "Recorrência", percent: true },
];

function metricLabel(key: TargetMetricKey): string {
  return TARGET_METRICS.find((m) => m.key === key)?.label ?? key;
}

function isPercentMetric(key: TargetMetricKey): boolean {
  return TARGET_METRICS.find((m) => m.key === key)?.percent ?? false;
}

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
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Não foi possível carregar as metas.");
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
      setError("Informe um valor numérico para a meta.");
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
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar a meta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(targetId: string) {
    setError(null);
    try {
      await api.del(`/api/v1/organizations/${organizationId}/targets/${targetId}`);
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível remover a meta.");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <IconTarget className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Metas</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Defina uma meta mensal por KPI. Receita e Lucro mostram o progresso somado no período
        selecionado acima; as demais métricas (razões, não somas) comparam mês a mês no gráfico de
        evolução.
      </p>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 flex flex-wrap items-end gap-3">
        <label className={labelClass}>
          Métrica
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as TargetMetricKey)}
            className={`${inputClass} w-auto`}
          >
            {TARGET_METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Mês
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={`${inputClass} w-auto`}
          />
        </label>
        <label className={labelClass}>
          Meta {isPercentMetric(metric) ? "(%)" : ""}
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
          {saving ? "Salvando..." : "Salvar meta"}
        </button>
      </form>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-slate-400">Carregando metas...</p>
        ) : targets.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma meta definida ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {targets.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
              >
                <span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{metricLabel(t.metric)}</span>
                  <span className="text-slate-400"> · {formatMonthYear(t.period)} · </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {isPercentMetric(t.metric) ? formatPercentage(t.value) : formatCompactNumber(t.value)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(t.id)}
                  aria-label={`Remover meta de ${metricLabel(t.metric)} de ${formatMonthYear(t.period)}`}
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
