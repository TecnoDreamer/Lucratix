"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { formatValue, type FunnelSnapshot } from "@/lib/business";

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

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Link href={`/organizations/${id}`} className="text-sm text-zinc-500 underline dark:text-zinc-400">
        &larr; Voltar
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Funil</h1>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Período</th>
            {FIELDS.map((f) => (
              <th key={f.key} className="py-2">
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s) => (
            <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{s.period}</td>
              {FIELDS.map((f) => (
                <td key={f.key} className="py-2">
                  {formatValue(s[f.key] as number | null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <form
        onSubmit={handleSave}
        className="mt-8 flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Período
          <input
            type="month"
            value={period.slice(0, 7)}
            onChange={(e) => setPeriod(`${e.target.value}-01`)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            {f.label}
            <input
              type="number"
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Salvando..." : "Salvar período"}
        </button>
      </form>
    </div>
  );
}
