"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { resolvePreset, type DateRange } from "@/lib/date-ranges";
import {
  formatMetric,
  formatPercentChange,
  type ExecutiveDashboard,
  type ExecutiveSeries,
  type MarketingAnalytics,
  type MetricWithComparison,
  type MonthlyMetrics,
} from "@/lib/metrics";
import { getMetricById } from "@/domain/metrics/metric-utils";
import { sectionTitle, buttonSecondary } from "@/lib/ui";
import { useOrganization } from "@/contexts/organization-context";
import { Alert, Card, Skeleton } from "@/components/ui";
import { MetricHelp } from "@/components/metric-help";
import { DateRangeFilter } from "@/components/date-range-filter";
import { SeriesChart } from "@/components/series-chart";
import { InsightsPanel } from "@/components/insights-panel";
import { computeExecutiveInsights } from "@/lib/insights";
import { buildExecutiveSeriesCsv } from "@/lib/analytics-export";
import { triggerBrowserDownload } from "@/lib/browser-download";
import {
  IconDollar,
  IconDownload,
  IconGrid,
  IconMegaphone,
  IconPackage,
  IconFunnel,
  IconTrendingDown,
  IconTrendingUp,
} from "@/components/icons";

type CardConfig<T> = { key: keyof T & string; label: string; percent?: boolean; icon: typeof IconDollar };

// Os 7 KPIs comuns a ExecutiveDashboard (agregado) e MonthlyMetrics (um
// ponto da série) — os únicos campos que fazem sentido virar gráfico.
type DashboardMetricKey = keyof ExecutiveDashboard & keyof MonthlyMetrics;

const CARDS: CardConfig<ExecutiveDashboard>[] = [
  { key: "revenue", label: "Receita", icon: IconDollar },
  { key: "profit", label: "Lucro", icon: IconTrendingUp },
  { key: "margin", label: "Margem", percent: true, icon: IconGrid },
  { key: "cac", label: "CAC", icon: IconPackage },
  { key: "conversion_rate", label: "Conversão", percent: true, icon: IconFunnel },
  { key: "average_ticket", label: "Ticket médio", icon: IconDollar },
  { key: "recurrence_rate", label: "Recorrência", percent: true, icon: IconTrendingUp },
];

const MARKETING_CARDS: CardConfig<MarketingAnalytics>[] = [
  { key: "roas", label: "ROAS", icon: IconMegaphone },
  { key: "roi", label: "ROI", percent: true, icon: IconTrendingUp },
  { key: "ctr", label: "CTR", percent: true, icon: IconFunnel },
  { key: "cpc", label: "CPC", icon: IconDollar },
  { key: "cpm", label: "CPM", icon: IconDollar },
  { key: "cpl", label: "CPL", icon: IconDollar },
  { key: "cpa", label: "CPA", icon: IconDollar },
];

function ComparisonBadge({
  comparison,
  metricId,
}: {
  comparison: MetricWithComparison["comparison"];
  metricId: string;
}) {
  if (comparison.percent_change === null) {
    return <p className="mt-1 text-xs text-slate-400 dark:text-slate-600">vs. período anterior: n/d</p>;
  }
  // Direção desejável importa: para CAC/CPC/CPM/CPL/CPA (lower_is_better),
  // uma queda é a notícia boa — nunca pintar todo aumento de verde sem
  // checar a métrica (ver domain/metrics/metric-types.ts::MetricDirection).
  // O ícone segue o sentido literal do número (subiu/desceu); a cor segue
  // o que é bom ou ruim para essa métrica especificamente.
  const wentUp = comparison.percent_change >= 0;
  const lowerIsBetter = getMetricById(metricId)?.direction === "lower_is_better";
  const positive = lowerIsBetter ? !wentUp : wentUp;
  const Icon = wentUp ? IconTrendingUp : IconTrendingDown;
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

function MetricGrid<T extends object>({ data, cards }: { data: T; cards: CardConfig<T>[] }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map(({ key, label, percent, icon: Icon }, i) => {
        const metric = data[key] as unknown as MetricWithComparison;
        return (
          <Card key={key} hover className="animate-fade-in-up p-4" style={{ animationDelay: `${i * 40}ms` }}>
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
            {metric.current.is_applicable && <ComparisonBadge comparison={metric.comparison} metricId={key} />}
          </Card>
        );
      })}
    </div>
  );
}

function SeriesGrid({ series }: { series: ExecutiveSeries }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map(({ key, label, percent, icon: Icon }, i) => (
        <Card key={key} className="animate-fade-in-up p-4" style={{ animationDelay: `${i * 40}ms` }}>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {label}
              <MetricHelp metric={key} />
            </p>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
              <Icon className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <SeriesChart
              points={series.points.map((p) => ({ period: p.period, metric: p[key as DashboardMetricKey] }))}
              percent={percent}
              label={label}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useOrganization();

  const [range, setRange] = useState<DateRange>(() => resolvePreset("current_month")!);
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [series, setSeries] = useState<ExecutiveSeries | null>(null);
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
      if (cancelled) return false;
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return true;
      }
      setError(err instanceof ApiError ? err.message : "Não foi possível conectar à API.");
      return true;
    };

    Promise.all([
      api
        .get<ExecutiveDashboard>(
          `/api/v1/organizations/${id}/analytics/executive?date_from=${range.dateFrom}&date_to=${range.dateTo}`
        )
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch(handleError),
      api
        .get<ExecutiveSeries>(
          `/api/v1/organizations/${id}/analytics/executive/series?date_from=${range.dateFrom}&date_to=${range.dateTo}`
        )
        .then((result) => {
          if (!cancelled) setSeries(result);
        })
        .catch(handleError),
      api
        .get<MarketingAnalytics>(
          `/api/v1/organizations/${id}/analytics/marketing?date_from=${range.dateFrom}&date_to=${range.dateTo}`
        )
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
  }, [id, range.dateFrom, range.dateTo]);

  const incomplete =
    data && (data.months_with_financial_data < data.months_in_range || data.months_with_funnel_data < data.months_in_range);

  const insights = data ? computeExecutiveInsights(data) : [];

  function handleExportSeries() {
    if (!series) return;
    const { filename, content } = buildExecutiveSeriesCsv({
      organizationName: organization?.name ?? "",
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      generatedAt: new Date(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      series,
    });
    // BOM (utf-8-sig): mesma convenção do export de dado bruto no backend
    // (serializers.py) — sem isso o Excel no Windows le acento errado.
    const BOM = String.fromCharCode(0xfeff);
    triggerBrowserDownload(new Blob([BOM + content], { type: "text/csv;charset=utf-8" }), filename);
  }

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
        data && <MetricGrid data={data} cards={CARDS} />
      )}

      {!loading && <InsightsPanel insights={insights} />}

      <div className="mt-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconTrendingUp className="h-4 w-4 text-slate-400" />
          <h2 className={sectionTitle}>Evolução mensal</h2>
        </div>
        {series && (
          <button type="button" onClick={handleExportSeries} className={`${buttonSecondary} px-3 py-1.5 text-xs`}>
            <IconDownload className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        series && <SeriesGrid series={series} />
      )}

      <div className="mt-10 flex items-center gap-2">
        <IconMegaphone className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Marketing</h2>
      </div>

      {marketing && !loading && marketing.campaign_count === 0 && (
        <div className="mt-4">
          <Alert tone="warning">
            Nenhuma campanha com data cadastrada no período selecionado — as métricas de marketing não
            puderam ser calculadas.
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
        marketing && <MetricGrid data={marketing} cards={MARKETING_CARDS} />
      )}
    </div>
  );
}
