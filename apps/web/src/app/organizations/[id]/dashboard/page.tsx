"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { currentMonthPeriod, formatMetric, formatPercentChange, type Dashboard } from "@/lib/metrics";
import { formatDecimal } from "@/lib/formatters";
import { comparisonToneClass, getComparisonTone, useComparisonToneLabel } from "@/lib/kpi";
import { hasMinimumRole } from "@/lib/roles";
import { input, sectionTitle } from "@/lib/ui";
import { Alert, Card, Skeleton } from "@/components/ui";
import { KpiCard } from "@/components/kpi-card";
import { GeneratePdfReportButton } from "@/components/generate-pdf-report-button";
import { useDashboard } from "@/hooks/use-dashboard";
import { useOrganization } from "@/contexts/organization-context";
import {
  IconDollar,
  IconFunnel,
  IconGrid,
  IconPackage,
  IconTrendingDown,
  IconTrendingUp,
} from "@/components/icons";

type CardConfig = { key: keyof Dashboard; labelKey: string; percent?: boolean; icon: typeof IconDollar };

// Hierarquia de KPIs: os 4 primários (financeiros — o que decide se o mês foi
// bom ou ruim) ganham destaque visual (cartão maior); os 3 secundários
// (operacionais) aparecem depois, menores. Mesma ordem/rótulos de antes, só
// reagrupados — nenhuma métrica nova, nenhuma removida.
const PRIMARY_CARDS: CardConfig[] = [
  { key: "revenue", labelKey: "revenue", icon: IconDollar },
  { key: "profit", labelKey: "profit", icon: IconTrendingUp },
  { key: "margin", labelKey: "margin", percent: true, icon: IconGrid },
  { key: "cac", labelKey: "cac", icon: IconPackage },
];

const SECONDARY_CARDS: CardConfig[] = [
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
  const toneLabel = useComparisonToneLabel();
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
            aria-label={t("periodLabel")}
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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        dashboard && (
          <>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("primaryHeading")}
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRIMARY_CARDS.map(({ key, labelKey, percent, icon: Icon }, i) => {
                const metric = dashboard[key];
                return (
                  <KpiCard
                    key={key}
                    size="primary"
                    index={i}
                    label={tMetricLabels(labelKey)}
                    metricHelpKey={key}
                    icon={Icon}
                    value={formatMetric(metric, { percent, notApplicableLabel: t("notApplicable") })}
                    reason={!metric.is_applicable ? metric.reason : null}
                  />
                );
              })}
            </div>

            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("secondaryHeading")}
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SECONDARY_CARDS.map(({ key, labelKey, percent, icon: Icon }, i) => {
                const metric = dashboard[key];
                return (
                  <KpiCard
                    key={key}
                    size="secondary"
                    index={i}
                    label={tMetricLabels(labelKey)}
                    metricHelpKey={key}
                    icon={Icon}
                    value={formatMetric(metric, { percent, notApplicableLabel: t("notApplicable") })}
                    reason={!metric.is_applicable ? metric.reason : null}
                  />
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
                      {revenueComparison.baseline_value !== null
                        ? formatDecimal(revenueComparison.baseline_value)
                        : t("notApplicable")}
                    </span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("current")}:{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {revenueComparison.current_value !== null
                        ? formatDecimal(revenueComparison.current_value)
                        : t("notApplicable")}
                    </span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("variation")}:{" "}
                    {(() => {
                      const tone = getComparisonTone("revenue", revenueComparison) ?? "neutral";
                      const Icon = (revenueComparison.percent_change ?? 0) >= 0 ? IconTrendingUp : IconTrendingDown;
                      return (
                        <span className={`inline-flex items-center gap-1 font-medium ${comparisonToneClass(tone)}`}>
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {formatPercentChange(revenueComparison, t("notApplicable"))}
                          {revenueComparison.percent_change !== null && <span>({toneLabel(tone)})</span>}
                        </span>
                      );
                    })()}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("noBaselineToCompare")}</p>
              )}
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t("variationDisclaimer")}</p>
            </Card>
          </>
        )
      )}
    </div>
  );
}
