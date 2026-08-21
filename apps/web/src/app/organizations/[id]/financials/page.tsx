"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { formatValue, type FinancialPeriod } from "@/lib/business";

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
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o período.");
    } finally {
      setSubmitting(false);
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
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Financeiro</h1>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Período</th>
            <th className="py-2">Receita</th>
            <th className="py-2">Lucro</th>
            <th className="py-2">Margem</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{p.period}</td>
              <td className="py-2">{formatValue(p.revenue)}</td>
              <td className="py-2">{formatValue(p.profit)}</td>
              <td className="py-2">
                {p.margin === null ? "não aplicável" : `${(p.margin * 100).toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        onSubmit={handleSave}
        className="mt-8 flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Período
          <input
            type="month"
            value={period.slice(0, 7)}
            onChange={(e) => setPeriod(`${e.target.value}-01`)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Receita
          <input
            type="number"
            step="0.01"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Custos
          <input
            type="number"
            step="0.01"
            value={costs}
            onChange={(e) => setCosts(e.target.value)}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Despesas
          <input
            type="number"
            step="0.01"
            value={expenses}
            onChange={(e) => setExpenses(e.target.value)}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Investimento em marketing
          <input
            type="number"
            step="0.01"
            value={marketingInvestment}
            onChange={(e) => setMarketingInvestment(e.target.value)}
            className="w-40 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Salvando..." : "Salvar período"}
        </button>
      </form>
    </div>
  );
}
