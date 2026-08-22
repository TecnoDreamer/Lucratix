"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMetric, type Dashboard, type PeriodComparison } from "@/lib/metrics";
import { input, sectionTitle } from "@/lib/ui";
import { Alert, Card, Skeleton } from "@/components/ui";
import {
  IconDollar,
  IconFunnel,
  IconGrid,
  IconPackage,
  IconTrendingUp,
} from "@/components/icons";

function currentMonthPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

async function fetchDashboardData(
  id: string,
  period: string
): Promise<{ dashboard: Dashboard; revenueComparison: PeriodComparison | null }> {
  const dashboard = await api.get<Dashboard>(`/api/v1/organizations/${id}/dashboard?period=${period}`);

  let revenueComparison: PeriodComparison | null = null;
  try {
    revenueComparison = await api.get<PeriodComparison>(
      `/api/v1/organizations/${id}/dashboard/compare-to-baseline?period=${period}&metric=revenue`
    );
  } catch (err) {
    // Sem baseline registrado ainda: comparacao fica indisponivel, painel segue funcional.
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  return { dashboard, revenueComparison };
}

const CARDS: { key: keyof Dashboard; label: string; percent?: boolean; icon: typeof IconDollar }[] = [
  { key: "revenue", label: "Receita", icon: IconDollar },
  { key: "profit", label: "Lucro", icon: IconTrendingUp },
  { key: "margin", label: "Margem", percent: true, icon: IconGrid },
  { key: "cac", label: "CAC", icon: IconPackage },
  { key: "conversion_rate", label: "Conversao", percent: true, icon: IconFunnel },
  { key: "average_ticket", label: "Ticket medio", icon: IconDollar },
  { key: "recurrence_rate", label: "Recorrencia", percent: true, icon: IconTrendingUp },
];

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [period, setPeriod] = useState(currentMonthPeriod());
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [revenueComparison, setRevenueComparison] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    fetchDashboardData(id, period)
      .then((result) => {
        if (cancelled) return;
        setDashboard(result.dashboard);
        setRevenueComparison(result.revenueComparison);
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
    <div className="animate-fade-in-up py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconGrid className="h-4 w-4 text-slate-400" />
          <h2 className={sectionTitle}>Dashboard</h2>
        </div>
        <input
          type="month"
          value={period.slice(0, 7)}
          onChange={(e) => setPeriod(`${e.target.value}-01`)}
          className={`${input} w-auto`}
        />
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        dashboard && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CARDS.map(({ key, label, percent, icon: Icon }, i) => {
                const metric = dashboard[key];
                return (
                  <Card
                    key={key}
                    hover
                    className="animate-fade-in-up p-4"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {label}
                      </p>
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {formatMetric(metric, { percent })}
                    </p>
                    {!metric.is_applicable && metric.reason && (
                      <p className="mt-1 text-xs text-slate-400">{metric.reason}</p>
                    )}
                  </Card>
                );
              })}
            </div>

            <Card className="mt-6 p-5">
              <h2 className={sectionTitle}>Receita: baseline vs. periodo selecionado</h2>
              {revenueComparison ? (
                <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Baseline:{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {revenueComparison.baseline_value ?? "não aplicável"}
                    </span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Atual:{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {revenueComparison.current_value ?? "não aplicável"}
                    </span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Variacao:{" "}
                    <span
                      className={`font-medium ${
                        (revenueComparison.percent_change ?? 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {revenueComparison.percent_change === null
                        ? "não aplicável"
                        : `${(revenueComparison.percent_change * 100).toFixed(1)}%`}
                    </span>
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Nenhum baseline registrado ainda para comparar.
                </p>
              )}
              <p className="mt-3 text-xs text-slate-400">
                Esta variacao e apenas observada — nao afirma que foi causada pelas acoes de
                marketing realizadas (ver docs/product/user-journey.md).
              </p>
            </Card>
          </>
        )
      )}
    </div>
  );
}
