"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatMetric, type Dashboard, type PeriodComparison } from "@/lib/metrics";
import { input, sectionTitle } from "@/lib/ui";
import { Alert, Card, Skeleton } from "@/components/ui";
import { IconFileText } from "@/components/icons";
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
    <div className="animate-fade-in-up py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconFileText className="h-4 w-4 text-slate-400" />
          <h2 className={sectionTitle}>Relatório básico</h2>
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
        report && (
          <>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {report.organization.name} — gerado em{" "}
              {new Date(report.generated_at).toLocaleString("pt-BR")}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                <Card key={key} className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {formatMetric(report.dashboard[key], {
                      percent: key === "margin" || key === "conversion_rate",
                    })}
                  </p>
                </Card>
              ))}
            </div>

            <Card className="mt-6 p-5">
              <h2 className={sectionTitle}>Vs. baseline</h2>
              {report.revenue_vs_baseline ? (
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-50">
                  Receita: {report.revenue_vs_baseline.baseline_value ?? "n/a"} &rarr;{" "}
                  {report.revenue_vs_baseline.current_value ?? "n/a"} (
                  {report.revenue_vs_baseline.percent_change === null
                    ? "variação não aplicável"
                    : `${(report.revenue_vs_baseline.percent_change * 100).toFixed(1)}%`}
                  )
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Nenhum baseline registrado ainda.
                </p>
              )}
            </Card>
          </>
        )
      )}
    </div>
  );
}
