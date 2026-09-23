"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import type { Experiment, ExperimentResult } from "@/lib/business";
import { formatPercentage } from "@/lib/formatters";
import { buttonPrimary, buttonSecondary, input, label, select as selectClass, sectionTitle } from "@/lib/ui";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { IconFlask } from "@/components/icons";
import { ChannelBarChart, type ChannelBarChartDatum } from "@/components/channel-bar-chart";

async function fetchExperiments(id: string): Promise<Experiment[]> {
  return api.get<Experiment[]>(`/api/v1/organizations/${id}/experiments`);
}

async function fetchResult(id: string, experimentId: string): Promise<ExperimentResult> {
  return api.get<ExperimentResult>(`/api/v1/organizations/${id}/experiments/${experimentId}/result`);
}

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  running: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  finished: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

// Espelha `_VALID_STATUS_TRANSITIONS` em apps/api/app/modules/experiments/router.py
// (L-08): ciclo linear, sem voltar atrás — `finished` não tem próximo passo.
const NEXT_STATUS: Partial<Record<Experiment["status"], Experiment["status"]>> = {
  draft: "running",
  running: "finished",
};

export default function ExperimentsPage() {
  const t = useTranslations("experiments");
  const tCommon = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<Record<string, ExperimentResult>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hypothesis, setHypothesis] = useState("");
  const [pageOrProcess, setPageOrProcess] = useState("");
  const [primaryMetric, setPrimaryMetric] = useState("conversion_rate");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchExperiments(id)
      .then((fetched) => {
        if (cancelled) return;
        setExperiments(fetched);
        setLoading(false);
        // Busca o resultado de todos os experimentos já no carregamento
        // inicial (PR pós-PR4, gráfico de conversão por variante) — antes,
        // `results` só era preenchido depois de editar uma variante, e o
        // gráfico nunca apareceria numa primeira visita à tela. Roda depois
        // de `setLoading(false)`, sem bloquear a lista principal por causa
        // dela; falhas individuais (ex.: experimento recém-criado, sem dado
        // ainda) não devem quebrar as demais — cada busca é independente.
        void Promise.all(
          fetched.map(async (exp) => {
            try {
              return [exp.id, await fetchResult(id, exp.id)] as const;
            } catch {
              return null;
            }
          })
        ).then((entries) => {
          if (cancelled) return;
          const resultsById = Object.fromEntries(
            entries.filter((e): e is readonly [string, ExperimentResult] => e !== null)
          );
          setResults((prev) => ({ ...prev, ...resultsById }));
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
          return;
        }
        setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // t/tCommon (tradutores) omitidos de propósito: nunca são referencialmente
    // estáveis entre renders — ver nota em organizations/page.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const experiment = await api.post<Experiment>(`/api/v1/organizations/${id}/experiments`, {
        hypothesis,
        page_or_process: pageOrProcess,
        primary_metric: primaryMetric,
        variants: [{ name: "Controle" }, { name: "Variante" }],
      });
      setExperiments((prev) => [experiment, ...prev]);
      setHypothesis("");
      setPageOrProcess("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function advanceStatus(experimentId: string, nextStatus: Experiment["status"]) {
    setError(null);
    try {
      const updated = await api.patch<Experiment>(
        `/api/v1/organizations/${id}/experiments/${experimentId}/status`,
        { status: nextStatus }
      );
      setExperiments((prev) => prev.map((e) => (e.id === experimentId ? updated : e)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("statusUpdateError"));
    }
  }

  async function updateVariant(
    experimentId: string,
    variantId: string,
    sampleSize: string,
    conversions: string
  ) {
    try {
      await api.patch(
        `/api/v1/organizations/${id}/experiments/${experimentId}/variants/${variantId}`,
        { sample_size: sampleSize ? Number(sampleSize) : null, conversions: conversions ? Number(conversions) : null }
      );
      const result = await fetchResult(id, experimentId);
      setResults((prev) => ({ ...prev, [experimentId]: result }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("variantUpdateError"));
    }
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconFlask className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : experiments.length === 0 ? (
          <EmptyState
            icon={<IconFlask className="h-5 w-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {experiments.map((exp) => {
              const result = results[exp.id];
              return (
                <li key={exp.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-50">{exp.hypothesis}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[exp.status] ?? STATUS_TONE.draft}`}
                        >
                          {t(`status.${exp.status}`)}
                        </span>
                        {NEXT_STATUS[exp.status] && (
                          <button
                            onClick={() => advanceStatus(exp.id, NEXT_STATUS[exp.status]!)}
                            className={`${buttonSecondary} px-2.5 py-1 text-xs`}
                          >
                            {t(`advance.${exp.status}`)}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {exp.page_or_process} · {exp.primary_metric}
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {exp.variants.map((v) => (
                        <VariantEditor
                          key={v.id}
                          variant={v}
                          significance={result?.variants.find((r) => r.name === v.name)}
                          onSave={(sampleSize, conversions) =>
                            updateVariant(exp.id, v.id, sampleSize, conversions)
                          }
                        />
                      ))}
                    </div>

                    {result && (
                      <>
                        <div className="mt-3">
                          <ChannelBarChart
                            data={result.variants.map(
                              (v): ChannelBarChartDatum => ({
                                key: v.name,
                                label: v.name,
                                value: v.conversion_rate.is_applicable ? v.conversion_rate.value : null,
                              })
                            )}
                            valueFormatter={formatPercentage}
                            label={t("conversionRateByVariant")}
                          />
                        </div>
                        <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
                          <p className="font-medium">
                            {result.leading_variant_name
                              ? t("leadingVariant", { name: result.leading_variant_name })
                              : t("noLeadingVariant")}
                          </p>
                          <p className="mt-1 text-blue-800/80 dark:text-blue-200/80">{result.note}</p>
                        </div>
                      </>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Card className="mt-6 p-5">
        <h2 className={sectionTitle}>{t("newExperiment")}</h2>
        <form onSubmit={handleCreate} className="mt-3 flex flex-col gap-3">
          <label className={label}>
            {t("hypothesisLabel")}
            <input required value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} className={input} />
          </label>
          <label className={label}>
            {t("pageOrProcessLabel")}
            <input
              required
              value={pageOrProcess}
              onChange={(e) => setPageOrProcess(e.target.value)}
              className={input}
            />
          </label>
          <label className={label}>
            {t("primaryMetricLabel")}
            <select
              value={primaryMetric}
              onChange={(e) => setPrimaryMetric(e.target.value)}
              className={selectClass}
            >
              <option value="conversion_rate">{t("metricConversionRate")}</option>
              <option value="average_ticket">{t("metricAverageTicket")}</option>
              <option value="cac">{t("metricCac")}</option>
            </select>
          </label>
          <button type="submit" disabled={submitting} className={`${buttonPrimary} self-start`}>
            {submitting ? t("creating") : t("createButton")}
          </button>
        </form>
      </Card>
    </div>
  );
}

function VariantEditor({
  variant,
  significance,
  onSave,
}: {
  variant: { id: string; name: string; sample_size: number | null; conversions: number | null };
  significance?: { p_value: number | null; is_significant: boolean | null };
  onSave: (sampleSize: string, conversions: string) => void;
}) {
  const t = useTranslations("experiments");
  const tCommon = useTranslations("common");
  const [sampleSize, setSampleSize] = useState(variant.sample_size?.toString() ?? "");
  const [conversions, setConversions] = useState(variant.conversions?.toString() ?? "");

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-50">
        {variant.name}
        <Badge tone="slate">{variant.name === "Controle" ? t("baseline") : t("test")}</Badge>
        {significance?.p_value !== null && significance?.p_value !== undefined && (
          <Badge tone={significance.is_significant ? "emerald" : "slate"}>
            {significance.is_significant ? t("significant") : t("notSignificant")} (p=
            {significance.p_value.toFixed(3)})
          </Badge>
        )}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          placeholder={t("sampleSizePlaceholder")}
          value={sampleSize}
          onChange={(e) => setSampleSize(e.target.value)}
          className={`${input} w-20 text-xs`}
        />
        <input
          type="number"
          placeholder={t("conversionsPlaceholder")}
          value={conversions}
          onChange={(e) => setConversions(e.target.value)}
          className={`${input} w-24 text-xs`}
        />
        <button onClick={() => onSave(sampleSize, conversions)} className={`${buttonSecondary} px-2.5 py-1 text-xs`}>
          {tCommon("save")}
        </button>
      </div>
    </div>
  );
}
