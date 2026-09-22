"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { formatValue, type FinancialPeriod } from "@/lib/business";
import { formatPercentage } from "@/lib/formatters";
import { buttonPrimary, input, label, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui";
import { IconDollar } from "@/components/icons";
import { SeriesChart, type SeriesPoint } from "@/components/series-chart";
import { ScrollableCard } from "@/components/scrollable-card";

/** `FinancialPeriod[]` (já buscado por `fetchPeriods`) → `SeriesPoint[]`
 * para `SeriesChart` — nenhuma chamada de API nova: a série mensal já está
 * inteira na resposta de `GET /financials`, só falta ordenar e converter
 * pro formato `MetricResult` que o gráfico espera. */
function toSeries(periods: FinancialPeriod[], key: "revenue" | "profit" | "margin"): SeriesPoint[] {
  return [...periods]
    .sort((a, b) => (a.period < b.period ? -1 : 1))
    .map((p) => ({
      period: p.period,
      metric: { value: p[key], is_applicable: p[key] !== null, reason: null },
    }));
}

async function fetchPeriods(id: string): Promise<FinancialPeriod[]> {
  return api.get<FinancialPeriod[]>(`/api/v1/organizations/${id}/financials`);
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function FinancialsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("financials");
  const tCommon = useTranslations("common");

  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState(currentMonth());
  const [revenue, setRevenue] = useState("");
  const [costs, setCosts] = useState("");
  const [expenses, setExpenses] = useState("");
  const [marketingInvestment, setMarketingInvestment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPeriods(id)
      .then((result) => {
        if (!cancelled) setPeriods(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
          return;
        }
        setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
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
      const saved = await api.put<FinancialPeriod>(`/api/v1/organizations/${id}/financials`, {
        period,
        revenue: revenue ? Number(revenue) : null,
        costs: costs ? Number(costs) : null,
        expenses: expenses ? Number(expenses) : null,
        marketing_investment: marketingInvestment ? Number(marketingInvestment) : null,
      });
      setPeriods((prev) => {
        const withoutSamePeriod = prev.filter((p) => p.period !== saved.period);
        return [...withoutSamePeriod, saved].sort((a, b) => (a.period < b.period ? 1 : -1));
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("saveGenericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconDollar className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {!loading && periods.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("revenue")}
            </p>
            <SeriesChart points={toSeries(periods, "revenue")} label={t("revenue")} />
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("profit")}
            </p>
            <SeriesChart points={toSeries(periods, "profit")} label={t("profit")} />
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("margin")}
            </p>
            <SeriesChart points={toSeries(periods, "margin")} percent label={t("margin")} />
          </Card>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : periods.length === 0 ? (
          <EmptyState
            icon={<IconDollar className="h-5 w-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <ScrollableCard>
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className="px-4 py-2.5">{t("period")}</th>
                  <th className="px-4 py-2.5">{t("revenue")}</th>
                  <th className="px-4 py-2.5">{t("profit")}</th>
                  <th className="px-4 py-2.5">{t("margin")}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id} className={tableRow}>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                      {p.period}
                    </td>
                    <td className="px-4 py-2.5">{formatValue(p.revenue, tCommon("notApplicable"))}</td>
                    <td className="px-4 py-2.5">{formatValue(p.profit, tCommon("notApplicable"))}</td>
                    <td className="px-4 py-2.5">
                      {p.margin === null ? tCommon("notApplicable") : formatPercentage(p.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableCard>
        )}
      </div>

      <Card className="mt-6 p-5">
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <label className={label}>
            {t("period")}
            <input
              type="month"
              value={period.slice(0, 7)}
              onChange={(e) => setPeriod(`${e.target.value}-01`)}
              className={input}
            />
          </label>
          <label className={label}>
            {t("revenue")}
            <input
              type="number"
              step="0.01"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className={`${input} w-28`}
            />
          </label>
          <label className={label}>
            {t("costs")}
            <input
              type="number"
              step="0.01"
              value={costs}
              onChange={(e) => setCosts(e.target.value)}
              className={`${input} w-28`}
            />
          </label>
          <label className={label}>
            {t("expenses")}
            <input
              type="number"
              step="0.01"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              className={`${input} w-28`}
            />
          </label>
          <label className={label}>
            {t("marketingInvestment")}
            <input
              type="number"
              step="0.01"
              value={marketingInvestment}
              onChange={(e) => setMarketingInvestment(e.target.value)}
              className={`${input} w-40`}
            />
          </label>
          <button type="submit" disabled={submitting} className={buttonPrimary}>
            {submitting ? t("saving") : t("savePeriod")}
          </button>
        </form>
      </Card>
    </div>
  );
}
