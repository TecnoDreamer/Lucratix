"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Baseline, Organization } from "@/lib/types";

function formatNumber(value: number | null): string {
  return value === null ? "nao aplicavel" : value.toLocaleString("pt-BR");
}

async function fetchOrganizationData(
  id: string
): Promise<{ organization: Organization; baselines: Baseline[] }> {
  const organization = await api.get<Organization>(`/api/v1/organizations/${id}`);
  const baselines = await api.get<Baseline[]>(`/api/v1/organizations/${id}/baselines`);
  return { organization, baselines };
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenue, setRevenue] = useState("");
  const [profit, setProfit] = useState("");
  const [cac, setCac] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleLoadError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.push("/login");
      return;
    }
    if (err instanceof ApiError && err.status === 404) {
      setError("Empresa nao encontrada ou voce nao tem acesso a ela.");
      return;
    }
    setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
  }

  useEffect(() => {
    let cancelled = false;
    fetchOrganizationData(id)
      .then(({ organization: org, baselines: history }) => {
        if (cancelled) return;
        setOrganization(org);
        setBaselines(history);
      })
      .catch((err: unknown) => {
        if (!cancelled) handleLoadError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateBaseline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/api/v1/organizations/${id}/baselines`, {
        revenue: revenue ? Number(revenue) : null,
        profit: profit ? Number(profit) : null,
        cac: cac ? Number(cac) : null,
      });
      setRevenue("");
      setProfit("");
      setCac("");
      const { organization: org, baselines: history } = await fetchOrganizationData(id);
      setOrganization(org);
      setBaselines(history);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel registrar o baseline.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Carregando...</div>;
  }

  if (!organization) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link href="/organizations" className="mt-4 inline-block text-sm underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/organizations" className="text-sm text-zinc-500 underline dark:text-zinc-400">
        &larr; Suas empresas
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {organization.name}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Seu papel: {organization.my_role}</p>
      <Link
        href={`/organizations/${id}/dashboard`}
        className="mt-2 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
      >
        Ver dashboard
      </Link>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Historico de baseline
        </h2>
        {baselines.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum baseline registrado ainda.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {baselines.map((b) => (
              <li
                key={b.id}
                className="rounded-md border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              >
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{new Date(b.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-zinc-900 dark:text-zinc-50">
                  <span>Receita: {formatNumber(b.revenue)}</span>
                  <span>Lucro: {formatNumber(b.profit)}</span>
                  <span>CAC: {formatNumber(b.cac)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        onSubmit={handleCreateBaseline}
        className="mt-8 flex flex-col gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Registrar novo baseline
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Receita
            <input
              type="number"
              step="0.01"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Lucro
            <input
              type="number"
              step="0.01"
              value={profit}
              onChange={(e) => setProfit(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            CAC
            <input
              type="number"
              step="0.01"
              value={cac}
              onChange={(e) => setCac(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Campos deixados em branco ficam registrados como &quot;nao disponivel&quot;, nunca como
          zero.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Salvando..." : "Registrar baseline"}
        </button>
      </form>
    </div>
  );
}
