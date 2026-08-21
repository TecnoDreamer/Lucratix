"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMetric, type Dashboard, type PeriodComparison } from "@/lib/metrics";
import type { Organization } from "@/lib/types";

function currentMonthPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

interface DashboardData {
  organization: Organization;
  dashboard: Dashboard;
  revenueComparison: PeriodComparison | null;
}

async function fetchDashboardData(id: string, period: string): Promise<DashboardData> {
  const organization = await api.get<Organization>(`/api/v1/organizations/${id}`);
  const dashboard = await api.get<Dashboard>(
    `/api/v1/organizations/${id}/dashboard?period=${period}`
  );

  let revenueComparison: PeriodComparison | null = null;
  try {
    revenueComparison = await api.get<PeriodComparison>(
      `/api/v1/organizations/${id}/dashboard/compare-to-baseline?period=${period}&metric=revenue`
    );
  } catch (err) {
    // Sem baseline registrado ainda: comparacao fica indisponivel, painel segue funcional.
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  return { organization, dashboard, revenueComparison };
}

const CARDS: { key: keyof Dashboard; label: string; percent?: boolean }[] = [
  { key: "revenue", label: "Receita" },
  { key: "profit", label: "Lucro" },
  { key: "margin", label: "Margem", percent: true },
  { key: "cac", label: "CAC" },
  { key: "conversion_rate", label: "Conversao", percent: true },
  { key: "average_ticket", label: "Ticket medio" },
  { key: "recurrence_rate", label: "Recorrencia", percent: true },
];

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [period, setPeriod] = useState(currentMonthPeriod());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    fetchDashboardData(id, period)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, period]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Link href={`/organizations/${id}`} className="text-sm text-zinc-500 underline dark:text-zinc-400">
        &larr; Voltar
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard {data ? `— ${data.organization.name}` : ""}
        </h1>
        <input
          type="month"
          value={period.slice(0, 7)}
          onChange={(e) => setPeriod(`${e.target.value}-01`)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {loading && <p className="mt-6 text-sm text-zinc-500">Carregando...</p>}

      {!loading && data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CARDS.map(({ key, label, percent }) => {
              const metric = data.dashboard[key];
              return (
                <div
                  key={key}
                  className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatMetric(metric, { percent })}
                  </p>
                  {!metric.is_applicable && metric.reason && (
                    <p className="mt-1 text-xs text-zinc-400">{metric.reason}</p>
                  )}
                </div>
              );
            })}
          </div>

          <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Receita: baseline vs. periodo selecionado
            </h2>
            {data.revenueComparison ? (
              <div className="mt-2 flex gap-6 text-sm text-zinc-900 dark:text-zinc-50">
                <span>Baseline: {data.revenueComparison.baseline_value ?? "não aplicável"}</span>
                <span>Atual: {data.revenueComparison.current_value ?? "não aplicável"}</span>
                <span>
                  Variacao:{" "}
                  {data.revenueComparison.percent_change === null
                    ? "não aplicável"
                    : `${(data.revenueComparison.percent_change * 100).toFixed(1)}%`}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum baseline registrado ainda para comparar.
              </p>
            )}
            <p className="mt-2 text-xs text-zinc-400">
              Esta variacao e apenas observada — nao afirma que foi causada pelas acoes de
              marketing realizadas (ver docs/product/user-journey.md).
            </p>
          </section>
        </>
      )}
    </div>
  );
}
