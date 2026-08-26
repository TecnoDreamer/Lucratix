"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { resolvePreset, type DateRange } from "@/lib/date-ranges";
import {
  formatMetric,
  formatPercentChange,
  type ExecutiveDashboard,
  type MetricWithComparison,
} from "@/lib/metrics";
import { sectionTitle } from "@/lib/ui";
import { Alert, Card, Skeleton } from "@/components/ui";
import { MetricHelp } from "@/components/metric-help";
import { DateRangeFilter } from "@/components/date-range-filter";
import {
  IconDollar,
  IconGrid,
  IconPackage,
  IconFunnel,
  IconTrendingDown,
  IconTrendingUp,
} from "@/components/icons";

const CARDS: { key: keyof ExecutiveDashboard & string; label: string; percent?: boolean; icon: typeof IconDollar }[] = [
  { key: "revenue", label: "Receita", icon: IconDollar },
  { key: "profit", label: "Lucro", icon: IconTrendingUp },
  { key: "margin", label: "Margem", percent: true, icon: IconGrid },
  { key: "cac", label: "CAC", icon: IconPackage },
  { key: "conversion_rate", label: "Conversão", percent: true, icon: IconFunnel },
  { key: "average_ticket", label: "Ticket médio", icon: IconDollar },
  { key: "recurrence_rate", label: "Recorrência", percent: true, icon: IconTrendingUp },
];

function ComparisonBadge({ comparison }: { comparison: MetricWithComparison["comparison"] }) {
  if (comparison.percent_change === null) {
    return <p className="mt-1 text-xs text-slate-400 dark:text-slate-600">vs. período anterior: n/d</p>;
  }
  const positive = comparison.percent_change >= 0;
  const Icon = positive ? IconTrendingUp : IconTrendingDown;
  return (
    <p
      className={`mt-1 flex items-center gap-1 text-xs font-medium ${
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
      }`}
    >
      <Icon className="h-3 w-3" />
      {formatPercentChange(comparison)}
      <span className="font-normal text-slate-400 dark:text-slate-600">vs. período anterior</span>
    </p>
  );
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [range, setRange] = useState<DateRange>(() => resolvePreset("current_month")!);
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
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
      .get<ExecutiveDashboard>(
        `/api/v1/organizations/${id}/analytics/executive?date_from=${range.dateFrom}&date_to=${range.dateTo}`
      )
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
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
  }, [id, range.dateFrom, range.dateTo]);

  const incomplete =
    data && (data.months_with_financial_data < data.months_in_range || data.months_with_funnel_data < data.months_in_range);

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconGrid className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Visão Executiva</h2>
      </div>

      <div className="mt-4">
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {incomplete && !loading && (
        <div className="mt-4">
          <Alert tone="warning">
            Dados financeiros disponíveis para {data!.months_with_financial_data} de{" "}
            {data!.months_in_range} meses do período selecionado — os totais refletem só os meses com
            registro.
          </Alert>
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        data && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CARDS.map(({ key, label, percent, icon: Icon }, i) => {
              const metric = data[key] as MetricWithComparison;
              return (
                <Card
                  key={key}
                  hover
                  className="animate-fade-in-up p-4"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {label}
                      <MetricHelp metric={key} />
                    </p>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    {formatMetric(metric.current, { percent })}
                  </p>
                  {!metric.current.is_applicable && metric.current.reason && (
                    <p className="mt-1 text-xs text-slate-400">{metric.current.reason}</p>
                  )}
                  {metric.current.is_applicable && <ComparisonBadge comparison={metric.comparison} />}
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
