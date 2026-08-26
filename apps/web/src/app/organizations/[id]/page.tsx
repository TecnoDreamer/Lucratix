"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonPrimary, input, label, sectionTitle } from "@/lib/ui";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui";
import { IconClock, IconGrid, IconTrendingUp } from "@/components/icons";
import type { Baseline } from "@/lib/types";

function formatNumber(value: number | null): string {
  return value === null ? "não aplicável" : value.toLocaleString("pt-BR");
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenue, setRevenue] = useState("");
  const [profit, setProfit] = useState("");
  const [cac, setCac] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadBaselines(): Promise<Baseline[]> {
    return api.get<Baseline[]>(`/api/v1/organizations/${id}/baselines`);
  }

  useEffect(() => {
    let cancelled = false;
    loadBaselines()
      .then((history) => {
        if (!cancelled) setBaselines(history);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
          return;
        }
        setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
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
      setBaselines(await loadBaselines());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel registrar o baseline.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in-up py-8">
      {error && (
        <div className="mb-6">
          <Alert>{error}</Alert>
        </div>
      )}

      <section>
        <div className="flex items-center gap-2">
          <IconClock className="h-4 w-4 text-slate-400" />
          <h2 className={sectionTitle}>Historico de baseline</h2>
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : baselines.length === 0 ? (
            <EmptyState
              icon={<IconTrendingUp className="h-5 w-5" />}
              title="Nenhum baseline registrado ainda."
              description="Registre o primeiro abaixo para acompanhar a evolução do negócio ao longo do tempo."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {baselines.map((b, i) => (
                <li key={b.id}>
                  <Card
                    className="px-4 py-3 text-sm animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                  >
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{new Date(b.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 font-medium text-slate-900 dark:text-slate-50">
                      <span>Receita: {formatNumber(b.revenue)}</span>
                      <span>Lucro: {formatNumber(b.profit)}</span>
                      <span>CAC: {formatNumber(b.cac)}</span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Card className="mt-8 p-5">
        <div className="flex items-center gap-2">
          <IconGrid className="h-4 w-4 text-slate-400" />
          <h2 className={sectionTitle}>Registrar novo baseline</h2>
        </div>
        <form onSubmit={handleCreateBaseline} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={label}>
              Receita
              <input
                type="number"
                step="0.01"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className={input}
              />
            </label>
            <label className={label}>
              Lucro
              <input
                type="number"
                step="0.01"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                className={input}
              />
            </label>
            <label className={label}>
              CAC
              <input
                type="number"
                step="0.01"
                value={cac}
                onChange={(e) => setCac(e.target.value)}
                className={input}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Campos deixados em branco ficam registrados como &quot;nao disponivel&quot;, nunca como
            zero.
          </p>
          <button type="submit" disabled={submitting} className={`${buttonPrimary} self-start`}>
            {submitting ? "Salvando..." : "Registrar baseline"}
          </button>
        </form>
      </Card>
    </div>
  );
}
