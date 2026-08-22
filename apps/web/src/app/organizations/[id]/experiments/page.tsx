"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Experiment, ExperimentResult } from "@/lib/business";
import { buttonPrimary, buttonSecondary, input, label, select as selectClass, sectionTitle } from "@/lib/ui";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { IconFlask } from "@/components/icons";

async function fetchExperiments(id: string): Promise<Experiment[]> {
  return api.get<Experiment[]>(`/api/v1/organizations/${id}/experiments`);
}

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  running: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  finished: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

export default function ExperimentsPage() {
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
      .then((result) => {
        if (!cancelled) setExperiments(result);
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
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o experimento.");
    } finally {
      setSubmitting(false);
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
      const result = await api.get<ExperimentResult>(
        `/api/v1/organizations/${id}/experiments/${experimentId}/result`
      );
      setResults((prev) => ({ ...prev, [experimentId]: result }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar a variante.");
    }
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconFlask className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Experimentos (CRO)</h2>
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
            title="Nenhum experimento criado ainda."
            description="Crie o primeiro teste A/B abaixo — controle e variante são criados automaticamente."
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
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[exp.status] ?? STATUS_TONE.draft}`}
                      >
                        {exp.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {exp.page_or_process} · {exp.primary_metric}
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {exp.variants.map((v) => (
                        <VariantEditor
                          key={v.id}
                          variant={v}
                          onSave={(sampleSize, conversions) =>
                            updateVariant(exp.id, v.id, sampleSize, conversions)
                          }
                        />
                      ))}
                    </div>

                    {result && (
                      <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
                        <p className="font-medium">
                          {result.leading_variant_name
                            ? `Variante em vantagem (indicativo): ${result.leading_variant_name}`
                            : "Nenhuma variante em vantagem indicada."}
                        </p>
                        <p className="mt-1 text-blue-800/80 dark:text-blue-200/80">{result.note}</p>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Card className="mt-6 p-5">
        <h2 className={sectionTitle}>Novo experimento</h2>
        <form onSubmit={handleCreate} className="mt-3 flex flex-col gap-3">
          <label className={label}>
            Hipótese
            <input required value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} className={input} />
          </label>
          <label className={label}>
            Página/processo
            <input
              required
              value={pageOrProcess}
              onChange={(e) => setPageOrProcess(e.target.value)}
              className={input}
            />
          </label>
          <label className={label}>
            Métrica principal
            <select
              value={primaryMetric}
              onChange={(e) => setPrimaryMetric(e.target.value)}
              className={selectClass}
            >
              <option value="conversion_rate">Taxa de conversão</option>
              <option value="average_ticket">Ticket médio</option>
              <option value="cac">CAC</option>
            </select>
          </label>
          <button type="submit" disabled={submitting} className={`${buttonPrimary} self-start`}>
            {submitting ? "Criando..." : "Criar experimento (Controle + Variante)"}
          </button>
        </form>
      </Card>
    </div>
  );
}

function VariantEditor({
  variant,
  onSave,
}: {
  variant: { id: string; name: string; sample_size: number | null; conversions: number | null };
  onSave: (sampleSize: string, conversions: string) => void;
}) {
  const [sampleSize, setSampleSize] = useState(variant.sample_size?.toString() ?? "");
  const [conversions, setConversions] = useState(variant.conversions?.toString() ?? "");

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-50">
        {variant.name}
        <Badge tone="slate">{variant.name === "Controle" ? "baseline" : "teste"}</Badge>
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          placeholder="Amostra"
          value={sampleSize}
          onChange={(e) => setSampleSize(e.target.value)}
          className={`${input} w-20 text-xs`}
        />
        <input
          type="number"
          placeholder="Conversões"
          value={conversions}
          onChange={(e) => setConversions(e.target.value)}
          className={`${input} w-24 text-xs`}
        />
        <button onClick={() => onSave(sampleSize, conversions)} className={`${buttonSecondary} px-2.5 py-1 text-xs`}>
          Salvar
        </button>
      </div>
    </div>
  );
}
