"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { currentMonthPeriod, formatMetric, formatPercentChange, type Dashboard } from "@/lib/metrics";
import { hasMinimumRole } from "@/lib/roles";
import { input, sectionTitle } from "@/lib/ui";
import { Alert, Card, Skeleton } from "@/components/ui";
import { MetricHelp } from "@/components/metric-help";
import { GeneratePdfReportButton } from "@/components/generate-pdf-report-button";
import { useDashboard } from "@/hooks/use-dashboard";
import { useOrganization } from "@/contexts/organization-context";
import {
  IconDollar,
  IconFunnel,
  IconGrid,
  IconPackage,
  IconTrendingUp,
} from "@/components/icons";

const CARDS: { key: keyof Dashboard; labelKey: string; percent?: boolean; icon: typeof IconDollar }[] = [
  { key: "revenue", labelKey: "revenue", icon: IconDollar },
  { key: "profit", labelKey: "profit", icon: IconTrendingUp },
  { key: "margin", labelKey: "margin", percent: true, icon: IconGrid },
  { key: "cac", labelKey: "cac", icon: IconPackage },
  { key: "conversion_rate", labelKey: "conversionRate", percent: true, icon: IconFunnel },
  { key: "average_ticket", labelKey: "averageTicket", icon: IconDollar },
  { key: "recurrence_rate", labelKey: "recurrenceRate", percent: true, icon: IconTrendingUp },
];

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [period, setPeriod] = useState(currentMonthPeriod());
  const { dashboard, revenueComparison, loading, error } = useDashboard(id, period);
  const { organization } = useOrganization();
  const t = useTranslations("dashboard");
  const tMetricLabels = useTranslations("dashboard.metricLabels");
  // /reports/basic/pdf exige ANALYST+ (mesmo nivel de /reports/basic) mas o
  // Dashboard continua visivel a VIEWER (RN-010) — sem essa checagem, VIEWER
  // veria um botao que sempre resulta em 403. Mesmo helper de lib/roles.ts
  // ja usado em layout.tsx pra esconder o item de nav "Relatório" de VIEWER.
  const canGeneratePdf = hasMinimumRole(organization?.my_role, "ANALYST");

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconGrid className="h-4 w-4 text-slate-400" />
          <h2 className={sectionTitle}>{t("title")}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={period.slice(0, 7)}
            onChange={(e) => setPeriod(`${e.target.value}-01`)}
            className={`${input} w-auto`}
          />
          {canGeneratePdf && (
            <GeneratePdfReportButton
              path={`/api/v1/organizations/${id}/reports/basic/pdf?period=${period}`}
              label={t("generatePdfReport")}
            />
          )}
        </div>
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
              {CARDS.map(({ key, labelKey, percent, icon: Icon }, i) => {
                const metric = dashboard[key];
                return (
                  <Card
                    key={key}
                    hover
                    className="animate-fade-in-up p-4"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {tMetricLabels(labelKey)}
                        <MetricHelp metric={key} />
                      </p>
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {formatMetric(metric, { percent, notApplicableLabel: t("notApplicable") })}
                    </p>
                    {!metric.is_applicable && metric.reason && (
                      <p className="mt-1 text-xs text-slate-400">{metric.reason}</p>
                    )}
                  </Card>
                );
              })}
            </div>

            <Card className="mt-6 p-5">
              <h2 className={sectionTitle}>{t("baselineComparisonTitle")}</h2>
              {revenueComparison ? (
                <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("baseline")}:{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {revenueComparison.baseline_value ?? t("notApplicable")}
                    </span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("current")}:{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {revenueComparison.current_value ?? t("notApplicable")}
                    </span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("variation")}:{" "}
                    <span
                      className={`font-medium ${
                        (revenueComparison.percent_change ?? 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatPercentChange(revenueComparison, t("notApplicable"))}
                    </span>
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("noBaselineToCompare")}</p>
              )}
              <p className="mt-3 text-xs text-slate-400">{t("variationDisclaimer")}</p>
            </Card>
          </>
        )
      )}
    </div>
  );
}
