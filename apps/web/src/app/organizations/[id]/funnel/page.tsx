"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { formatValue, type FunnelSnapshot } from "@/lib/business";
import { buttonPrimary, input, label, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui";
import { IconFunnel } from "@/components/icons";

async function fetchSnapshots(id: string): Promise<FunnelSnapshot[]> {
  return api.get<FunnelSnapshot[]>(`/api/v1/organizations/${id}/funnel-snapshots`);
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const FIELDS: { key: keyof FunnelSnapshot; label: string }[] = [
  { key: "impressions", label: "Impressões" },
  { key: "visits", label: "Visitas" },
  { key: "leads", label: "Leads" },
  { key: "mqls", label: "MQLs" },
  { key: "sqls", label: "SQLs" },
  { key: "opportunities", label: "Oportunidades" },
  { key: "customers", label: "Clientes" },
  { key: "repeat_purchases", label: "Recompras" },
];

export default function FunnelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [snapshots, setSnapshots] = useState<FunnelSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState(currentMonth());
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSnapshots(id)
      .then((result) => {
        if (!cancelled) setSnapshots(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Não foi possível conectar à API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { period };
      for (const { key } of FIELDS) {
        payload[key] = values[key] ? Number(values[key]) : null;
      }
      const saved = await api.put<FunnelSnapshot>(
        `/api/v1/organizations/${id}/funnel-snapshots`,
        payload
      );
      setSnapshots((prev) => {
        const withoutSamePeriod = prev.filter((s) => s.period !== saved.period);
        return [...withoutSamePeriod, saved].sort((a, b) => (a.period < b.period ? 1 : -1));
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o funil.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconFunnel className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Funil</h2>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : snapshots.length === 0 ? (
          <EmptyState
            icon={<IconFunnel className="h-5 w-5" />}
            title="Nenhum snapshot de funil registrado ainda."
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className="px-4 py-2.5">Período</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} className="px-4 py-2.5">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id} className={tableRow}>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                      {s.period}
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="px-4 py-2.5">
                        {formatValue(s[f.key] as number | null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <Card className="mt-6 p-5">
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <label className={label}>
            Período
            <input
              type="month"
              value={period.slice(0, 7)}
              onChange={(e) => setPeriod(`${e.target.value}-01`)}
              className={input}
            />
          </label>
          {FIELDS.map((f) => (
            <label key={f.key} className={label}>
              {f.label}
              <input
                type="number"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className={`${input} w-24`}
              />
            </label>
          ))}
          <button type="submit" disabled={submitting} className={buttonPrimary}>
            {submitting ? "Salvando..." : "Salvar período"}
          </button>
        </form>
      </Card>
    </div>
  );
}
