"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Experiment, ExperimentResult } from "@/lib/business";

async function fetchExperiments(id: string): Promise<Experiment[]> {
  return api.get<Experiment[]>(`/api/v1/organizations/${id}/experiments`);
}

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

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href={`/organizations/${id}`} className="text-sm text-zinc-500 underline dark:text-zinc-400">
        &larr; Voltar
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Experimentos (CRO)</h1>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-4">
        {experiments.map((exp) => {
          const result = results[exp.id];
          return (
            <li key={exp.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{exp.hypothesis}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {exp.page_or_process} · {exp.primary_metric} · {exp.status}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
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
                <div className="mt-3 rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
                  <p>
                    {result.leading_variant_name
                      ? `Variante em vantagem (indicativo): ${result.leading_variant_name}`
                      : "Nenhuma variante em vantagem indicada."}
                  </p>
                  <p className="mt-1 text-zinc-500 dark:text-zinc-400">{result.note}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={handleCreate}
        className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Novo experimento
        </h2>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Hipótese
          <input
            required
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Página/processo
          <input
            required
            value={pageOrProcess}
            onChange={(e) => setPageOrProcess(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Métrica principal
          <select
            value={primaryMetric}
            onChange={(e) => setPrimaryMetric(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="conversion_rate">Taxa de conversão</option>
            <option value="average_ticket">Ticket médio</option>
            <option value="cac">CAC</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Criando..." : "Criar experimento (Controle + Variante)"}
        </button>
      </form>
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
    <div className="rounded-md border border-zinc-100 p-2 dark:border-zinc-800">
      <p className="text-sm font-medium">{variant.name}</p>
      <div className="mt-1 flex gap-2">
        <input
          type="number"
          placeholder="Amostra"
          value={sampleSize}
          onChange={(e) => setSampleSize(e.target.value)}
          className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="number"
          placeholder="Conversões"
          value={conversions}
          onChange={(e) => setConversions(e.target.value)}
          className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          onClick={() => onSave(sampleSize, conversions)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
