"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { formatValue, type FunnelSnapshot } from "@/lib/business";
import { resolvePreset, type DateRange } from "@/lib/date-ranges";
import { formatMetric } from "@/lib/metrics";
import {
  FUNNEL_STAGE_KEYS,
  type ChannelFunnel,
  type FunnelAnalytics,
  type FunnelByChannel,
  type FunnelSeries,
  type FunnelStageKey,
} from "@/lib/funnel-metrics";
import { computeFunnelInsights, type FunnelInsightCopy } from "@/lib/funnel-insights";
import { formatPeriodRange } from "@/lib/formatters";
import { funnelStagesSettingsForPreset, stageConversionSettingsForPreset } from "@/lib/chart-settings";
import {
  saveFunnelStagesPreferences,
  saveStageConversionPreferences,
  sanitizeFunnelStagesSettings,
  sanitizeStageConversionSettings,
} from "@/lib/chart-preferences";
import { buttonGhost, buttonPrimary, input, label, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui";
import { IconFunnel, IconSettings } from "@/components/icons";
import { DateRangeFilter } from "@/components/date-range-filter";
import { SegmentedControl } from "@/components/segmented-control";
import { MetricHelp } from "@/components/metric-help";
import { FunnelStagesChart } from "@/components/funnel-stages-chart";
import { StageConversionChart } from "@/components/stage-conversion-chart";
import { FunnelEvolutionChart } from "@/components/funnel-evolution-chart";
import { FunnelByChannelTable } from "@/components/funnel-by-channel-table";
import { InsightsPanel } from "@/components/insights-panel";
import { GeneratePdfReportButton } from "@/components/generate-pdf-report-button";
import { ChartSettingsDialog } from "@/components/chart-settings-dialog";
import { useChartSettings } from "@/hooks/use-chart-settings";
import { ScrollableCard } from "@/components/scrollable-card";

async function fetchSnapshots(id: string): Promise<FunnelSnapshot[]> {
  return api.get<FunnelSnapshot[]>(`/api/v1/organizations/${id}/funnel-snapshots`);
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const FIELD_KEYS: (keyof FunnelSnapshot)[] = [
  "impressions",
  "visits",
  "leads",
  "mqls",
  "sqls",
  "opportunities",
  "customers",
  "repeat_purchases",
];

type AnalyticsView = "aggregated" | "by_channel";

// FUNNEL_STAGE_KEYS usa o nome de coluna do backend (plural/snake_case,
// ex.: "repeat_purchases"); os verbetes do Glossário usam o conceito no
// singular (ex.: "repeat_purchase") — só impressions/visits coincidem.
const STAGE_GLOSSARY_ID: Record<FunnelStageKey, string> = {
  impressions: "impressions",
  visits: "visits",
  leads: "lead",
  mqls: "mql",
  sqls: "sql",
  opportunities: "opportunity",
  customers: "customer",
  repeat_purchases: "repeat_purchase",
};

/** Seção analítica do Funil (RF do prompt de funil/gráficos/PDF) — KPIs
 * por etapa, conversão/abandono, evolução temporal, alternância
 * agregado/por canal e insights determinísticos. A tabela de lançamento
 * manual abaixo continua sendo a forma de entrada de dado (sem mudança de
 * UI aqui), mas um período salvo por ela reflete aqui sozinho — ver
 * `analyticsReloadToken`. */
function FunnelAnalyticsSection({
  organizationId,
  analyticsReloadToken,
}: {
  organizationId: string;
  analyticsReloadToken: number;
}) {
  const router = useRouter();
  const t = useTranslations("funnel.analytics");
  const tFields = useTranslations("funnel.fields");
  const tCommon = useTranslations("common");
  const tInsights = useTranslations("funnel.insights");
  const funnelInsightCopy: FunnelInsightCopy = {
    stageLabel: (stage) => tFields(stage),
    biggestLeak: {
      title: tInsights("biggestLeak.title"),
      context: (from, to) => tInsights("biggestLeak.context", { from, to }),
      cta: (from, to) => tInsights("biggestLeak.cta", { from, to }),
    },
    biggestGrowth: {
      title: tInsights("biggestGrowth.title"),
      context: (from, to) => tInsights("biggestGrowth.context", { from, to }),
      cta: tInsights("biggestGrowth.cta"),
    },
    biggestDrop: {
      title: tInsights("biggestDrop.title"),
      context: (from, to) => tInsights("biggestDrop.context", { from, to }),
      cta: tInsights("biggestDrop.cta"),
    },
  };

  const [range, setRange] = useState<DateRange>(() => resolvePreset("current_month")!);
  const [view, setView] = useState<AnalyticsView>("aggregated");
  const [evolutionStage, setEvolutionStage] = useState<FunnelStageKey>("leads");

  const [analytics, setAnalytics] = useState<FunnelAnalytics | null>(null);
  const [series, setSeries] = useState<FunnelSeries | null>(null);
  const [byChannel, setByChannel] = useState<FunnelByChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [byChannelLoading, setByChannelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Personalização dos dois gráficos do Funil (redesign, PR2 + persistência
  // da PR3) — carrega a preferência salva por usuário+organização+gráfico
  // no mount e salva a cada "Aplicar". Ver hooks/use-chart-settings.ts.
  const funnelStagesSettings = useChartSettings(funnelStagesSettingsForPreset, {
    organizationId,
    chartKey: "funnel-stages",
    sanitize: sanitizeFunnelStagesSettings,
    save: saveFunnelStagesPreferences,
  });
  const conversionSettings = useChartSettings(stageConversionSettingsForPreset, {
    organizationId,
    chartKey: "stage-conversion",
    sanitize: sanitizeStageConversionSettings,
    save: saveStageConversionPreferences,
  });
  const tCharts = useTranslations("charts");

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
      setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
    };

    const query = `date_from=${range.dateFrom}&date_to=${range.dateTo}`;
    Promise.all([
      api
        .get<FunnelAnalytics>(`/api/v1/organizations/${organizationId}/analytics/funnel?${query}`)
        .then((result) => {
          if (!cancelled) setAnalytics(result);
        })
        .catch(handleError),
      api
        .get<FunnelSeries>(`/api/v1/organizations/${organizationId}/analytics/funnel/series?${query}`)
        .then((result) => {
          if (!cancelled) setSeries(result);
        })
        .catch(handleError),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, range.dateFrom, range.dateTo, analyticsReloadToken]);

  // "Por canal" busca sob demanda, na primeira vez que o toggle é usado —
  // evita uma chamada que a maioria das visitas (agregado, o padrão) nunca
  // precisa.
  useEffect(() => {
    if (view !== "by_channel" || byChannel !== null) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setByChannelLoading(true);
    });
    api
      .get<FunnelByChannel>(
        `/api/v1/organizations/${organizationId}/analytics/funnel/by-channel?date_from=${range.dateFrom}&date_to=${range.dateTo}`
      )
      .then((result) => {
        if (!cancelled) setByChannel(result);
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
        if (!cancelled) setByChannelLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, organizationId, range.dateFrom, range.dateTo]);

  // Trocar o período invalida o drill-down por canal já buscado, pra não
  // mostrar dado de um intervalo diferente do selecionado. Um período novo
  // salvo no lançamento manual (analyticsReloadToken) invalida do mesmo
  // jeito — sem isso, quem já está na aba "Por canal" não veria o dado
  // recém-lançado sem trocar de aba/período.
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setByChannel(null);
    });
    return () => {
      cancelled = true;
    };
  }, [range.dateFrom, range.dateTo, analyticsReloadToken]);

  const insights = analytics
    ? computeFunnelInsights(analytics.conversions, funnelInsightCopy, formatPeriodRange(analytics.date_from, analytics.date_to))
    : [];

  return (
    <div>
      <div className="flex items-center gap-2">
        <IconFunnel className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <DateRangeFilter value={range} onChange={setRange} />
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <SegmentedControl
            value={view}
            onChange={setView}
            ariaLabel={t("viewToggleLabel")}
            options={[
              { value: "aggregated", label: t("viewAggregated") },
              { value: "by_channel", label: t("viewByChannel") },
            ]}
          />
          <GeneratePdfReportButton
            path={`/api/v1/organizations/${organizationId}/reports/funnel/pdf?date_from=${range.dateFrom}&date_to=${range.dateTo}`}
            label={t("generatePdfReport")}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : view === "aggregated" && analytics && series ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FUNNEL_STAGE_KEYS.map((key) => (
              <Card key={key} className="p-4">
                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {tFields(key)}
                  <MetricHelp metric={STAGE_GLOSSARY_ID[key]} />
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {formatMetric(analytics.stages[key], { notApplicableLabel: tCommon("notApplicable") })}
                </p>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("funnelChartTitle")}</h3>
              <button
                type="button"
                onClick={funnelStagesSettings.open}
                aria-label={tCharts("actions.customize")}
                className={`${buttonGhost} !p-1.5`}
              >
                <IconSettings className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <FunnelStagesChart
                stages={analytics.stages}
                conversions={analytics.conversions}
                settings={funnelStagesSettings.active}
              />
            </div>
          </Card>

          <ChartSettingsDialog
            open={funnelStagesSettings.isOpen}
            title={t("customizeFunnelTitle")}
            preset={funnelStagesSettings.preset}
            onPresetChange={funnelStagesSettings.changePreset}
            onApply={funnelStagesSettings.apply}
            onCancel={funnelStagesSettings.cancel}
            onReset={funnelStagesSettings.reset}
          >
            {funnelStagesSettings.draft && (
              <>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {tCharts("settings.chartType")}
                  </p>
                  <SegmentedControl
                    value={funnelStagesSettings.draft.chartType}
                    onChange={(chartType) => funnelStagesSettings.updateDraft((d) => ({ ...d, chartType }))}
                    ariaLabel={tCharts("settings.chartType")}
                    options={[
                      { value: "funnel", label: t("funnelChartTypeFunnel") },
                      { value: "bars", label: t("funnelChartTypeBars") },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {tCharts("settings.density")}
                  </p>
                  <SegmentedControl
                    value={funnelStagesSettings.draft.density}
                    onChange={(density) => funnelStagesSettings.updateDraft((d) => ({ ...d, density }))}
                    ariaLabel={tCharts("settings.density")}
                    options={[
                      { value: "comfortable", label: tCharts("density.comfortable") },
                      { value: "compact", label: tCharts("density.compact") },
                    ]}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={funnelStagesSettings.draft.showValues}
                    onChange={(e) => funnelStagesSettings.updateDraft((d) => ({ ...d, showValues: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                  />
                  {tCharts("settings.showValues")}
                </label>
              </>
            )}
          </ChartSettingsDialog>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("conversionChartTitle")}</h3>
              <button
                type="button"
                onClick={conversionSettings.open}
                aria-label={tCharts("actions.customize")}
                className={`${buttonGhost} !p-1.5`}
              >
                <IconSettings className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <StageConversionChart
                conversions={analytics.conversions}
                stages={analytics.stages}
                tFields={tFields}
                settings={conversionSettings.active}
              />
            </div>
          </Card>

          <ChartSettingsDialog
            open={conversionSettings.isOpen}
            title={t("customizeConversionTitle")}
            preset={conversionSettings.preset}
            onPresetChange={conversionSettings.changePreset}
            onApply={conversionSettings.apply}
            onCancel={conversionSettings.cancel}
            onReset={conversionSettings.reset}
          >
            {conversionSettings.draft && (
              <>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {tCharts("settings.density")}
                  </p>
                  <SegmentedControl
                    value={conversionSettings.draft.density}
                    onChange={(density) => conversionSettings.updateDraft((d) => ({ ...d, density }))}
                    ariaLabel={tCharts("settings.density")}
                    options={[
                      { value: "comfortable", label: tCharts("density.comfortable") },
                      { value: "compact", label: tCharts("density.compact") },
                    ]}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={conversionSettings.draft.showValues}
                    onChange={(e) => conversionSettings.updateDraft((d) => ({ ...d, showValues: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                  />
                  {tCharts("settings.showValues")}
                </label>
              </>
            )}
          </ChartSettingsDialog>

          <InsightsPanel insights={insights} />

          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("evolutionChartTitle")}</h3>
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {t("evolutionStageLabel")}
                <select
                  value={evolutionStage}
                  onChange={(e) => setEvolutionStage(e.target.value as FunnelStageKey)}
                  className={`${input} w-auto py-1 text-xs`}
                >
                  {FUNNEL_STAGE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {tFields(key)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3">
              <FunnelEvolutionChart points={series.points} stage={evolutionStage} label={tFields(evolutionStage)} />
            </div>
          </Card>
        </div>
      ) : view === "by_channel" ? (
        byChannelLoading ? (
          <Skeleton className="mt-4 h-40 w-full" />
        ) : byChannel && byChannel.channels.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={<IconFunnel className="h-5 w-5" />} title={t("emptyByChannelTitle")} />
          </div>
        ) : byChannel ? (
          <FunnelByChannelTable channels={byChannel.channels as ChannelFunnel[]} />
        ) : null
      ) : null}
    </div>
  );
}

export default function FunnelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("funnel");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("funnel.fields");
  const FIELDS = FIELD_KEYS.map((key) => ({ key, label: tFields(key) }));

  const [snapshots, setSnapshots] = useState<FunnelSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState(currentMonth());
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  // Incrementado apos salvar um periodo, pra FunnelAnalyticsSection buscar de
  // novo sem esperar o usuario trocar o filtro/recarregar a pagina — mesmo
  // padrao de channelPerformanceReloadToken em marketing/page.tsx, so que
  // aqui a mutacao (este componente) e a busca (FunnelAnalyticsSection)
  // ficam em componentes diferentes, entao o token precisa virar prop.
  const [analyticsReloadToken, setAnalyticsReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchSnapshots(id)
      .then((result) => {
        if (!cancelled) setSnapshots(result);
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
      const payload: Record<string, unknown> = { period };
      for (const { key } of FIELDS) {
        payload[key] = values[key] ? Number(values[key]) : null;
      }
      const saved = await api.put<FunnelSnapshot>(
        `/api/v1/organizations/${id}/funnel-snapshots`,
        payload
      );
      setSnapshots((prev) => {
        const withoutSamePeriod = prev.filter((s) => s.period !== saved.period);
        return [...withoutSamePeriod, saved].sort((a, b) => (a.period < b.period ? 1 : -1));
      });
      setAnalyticsReloadToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("saveGenericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in-up py-8">
      <FunnelAnalyticsSection organizationId={id} analyticsReloadToken={analyticsReloadToken} />

      <div className="mt-10 flex items-center gap-2">
        <IconFunnel className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("manualEntryTitle")}</h2>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : snapshots.length === 0 ? (
          <EmptyState
            icon={<IconFunnel className="h-5 w-5" />}
            title={t("emptyTitle")}
          />
        ) : (
          <ScrollableCard>
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className="px-4 py-2.5">{t("period")}</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} className="px-4 py-2.5">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id} className={tableRow}>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                      {s.period}
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="px-4 py-2.5">
                        {formatValue(s[f.key] as number | null, tCommon("notApplicable"))}
                      </td>
                    ))}
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
          {FIELDS.map((f) => (
            <label key={f.key} className={label}>
              {f.label}
              <input
                type="number"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className={`${input} w-24`}
              />
            </label>
          ))}
          <button type="submit" disabled={submitting} className={buttonPrimary}>
            {submitting ? t("saving") : t("savePeriod")}
          </button>
        </form>
      </Card>
    </div>
  );
}
