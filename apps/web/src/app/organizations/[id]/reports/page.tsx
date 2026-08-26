"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import {
  formatMetric,
  formatPercentChange,
  type Dashboard,
  type MarketingAnalytics,
  type MetricWithComparison,
  type PeriodComparison,
} from "@/lib/metrics";
import { buttonSecondary, input, sectionTitle } from "@/lib/ui";
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

const MARKETING_CARDS: { key: keyof MarketingAnalytics & string; label: string; percent?: boolean }[] = [
  { key: "roas", label: "ROAS" },
  { key: "roi", label: "ROI", percent: true },
  { key: "ctr", label: "CTR", percent: true },
  { key: "cpc", label: "CPC" },
  { key: "cpm", label: "CPM" },
  { key: "cpl", label: "CPL" },
  { key: "cpa", label: "CPA" },
];

function currentMonthPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Último dia do mês de `period` (sempre "AAAA-MM-01"), em "AAAA-MM-DD". */
function monthEnd(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(year, month, 0);
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
}

async function fetchReport(id: string, period: string): Promise<BasicReport> {
  return api.get<BasicReport>(`/api/v1/organizations/${id}/reports/basic?period=${period}`);
}

async function fetchMarketing(id: string, period: string): Promise<MarketingAnalytics> {
  return api.get<MarketingAnalytics>(
    `/api/v1/organizations/${id}/analytics/marketing?date_from=${period}&date_to=${monthEnd(period)}`
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [period, setPeriod] = useState(currentMonthPeriod());
  const [report, setReport] = useState<BasicReport | null>(null);
  const [marketing, setMarketing] = useState<MarketingAnalytics | null>(null);
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

    const handleError = (err: unknown) => {
      if (cancelled) return;
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return;
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível conectar à API.");
    };

    Promise.all([
      fetchReport(id, period)
        .then((result) => {
          if (!cancelled) setReport(result);
        })
        .catch(handleError),
      fetchMarketing(id, period)
        .then((result) => {
          if (!cancelled) setMarketing(result);
        })
        .catch(handleError),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, period]);

  return (
    <div className="animate-fade-in-up py-8 print:animate-none print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconFileText className="h-4 w-4 text-slate-400 print:hidden" />
          <h2 className={sectionTitle}>Relatório executivo</h2>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <input
            type="month"
            value={period.slice(0, 7)}
            onChange={(e) => setPeriod(`${e.target.value}-01`)}
            className={`${input} w-auto`}
          />
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading || !report}
            className={buttonSecondary}
          >
            Imprimir / Salvar como PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 print:hidden">
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
                <Card key={key} className="p-4 print:break-inside-avoid print:border-slate-300 print:shadow-none">
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

            <Card className="mt-6 p-5 print:break-inside-avoid print:border-slate-300 print:shadow-none">
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

            <h2 className={`mt-8 ${sectionTitle}`}>Marketing do período</h2>
            {marketing && marketing.campaign_count === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Nenhuma campanha com data cadastrada neste período.
              </p>
            ) : (
              marketing && (
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {MARKETING_CARDS.map(({ key, label, percent }) => {
                    const metric = marketing[key] as MetricWithComparison;
                    return (
                      <Card
                        key={key}
                        className="p-4 print:break-inside-avoid print:border-slate-300 print:shadow-none"
                      >
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {label}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                          {formatMetric(metric.current, { percent })}
                        </p>
                        {metric.current.is_applicable && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatPercentChange(metric.comparison)} vs. mês anterior
                          </p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )
            )}
          </>
        )
      )}
    </div>
  );
}
