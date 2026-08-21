"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMetric, type Dashboard, type PeriodComparison } from "@/lib/metrics";
import type { Organization } from "@/lib/types";

interface BasicReport {
  organization: Organization;
  period: string;
  generated_at: string;
  dashboard: Dashboard;
  revenue_vs_baseline: PeriodComparison | null;
  profit_vs_baseline: PeriodComparison | null;
}

function currentMonthPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

async function fetchReport(id: string, period: string): Promise<BasicReport> {
  return api.get<BasicReport>(`/api/v1/organizations/${id}/reports/basic?period=${period}`);
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [period, setPeriod] = useState(currentMonthPeriod());
  const [report, setReport] = useState<BasicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReport(id, period)
      .then((result) => {
        if (!cancelled) setReport(result);
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
  }, [id, period]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href={`/organizations/${id}`} className="text-sm text-zinc-500 underline dark:text-zinc-400">
        &larr; Voltar
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Relatório básico</h1>
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

      {!loading && report && (
        <>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            {report.organization.name} — gerado em{" "}
            {new Date(report.generated_at).toLocaleString("pt-BR")}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["revenue", "Receita"],
                ["profit", "Lucro"],
                ["margin", "Margem"],
                ["cac", "CAC"],
                ["conversion_rate", "Conversão"],
                ["average_ticket", "Ticket médio"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {label}
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatMetric(report.dashboard[key], {
                    percent: key === "margin" || key === "conversion_rate",
                  })}
                </p>
              </div>
            ))}
          </div>

          <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Vs. baseline
            </h2>
            {report.revenue_vs_baseline ? (
              <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-50">
                Receita: {report.revenue_vs_baseline.baseline_value ?? "n/a"} &rarr;{" "}
                {report.revenue_vs_baseline.current_value ?? "n/a"} (
                {report.revenue_vs_baseline.percent_change === null
                  ? "variação não aplicável"
                  : `${(report.revenue_vs_baseline.percent_change * 100).toFixed(1)}%`}
                )
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum baseline registrado ainda.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
