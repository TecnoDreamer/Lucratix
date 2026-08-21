"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { formatValue, type Campaign, type MarketingChannel } from "@/lib/business";

async function fetchData(
  id: string
): Promise<{ channels: MarketingChannel[]; campaigns: Campaign[] }> {
  const channels = await api.get<MarketingChannel[]>(`/api/v1/organizations/${id}/marketing-channels`);
  const campaigns = await api.get<Campaign[]>(`/api/v1/organizations/${id}/campaigns`);
  return { channels, campaigns };
}

export default function MarketingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [channelName, setChannelName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [investment, setInvestment] = useState("");
  const [attributedRevenue, setAttributedRevenue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchData(id)
      .then((result) => {
        if (cancelled) return;
        setChannels(result.channels);
        setCampaigns(result.campaigns);
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

  async function handleCreateChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const channel = await api.post<MarketingChannel>(
        `/api/v1/organizations/${id}/marketing-channels`,
        { name: channelName }
      );
      setChannels((prev) => [...prev, channel]);
      setChannelName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o canal.");
    }
  }

  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const campaign = await api.post<Campaign>(`/api/v1/organizations/${id}/campaigns`, {
        channel_id: channelId,
        name: campaignName,
        investment: investment ? Number(investment) : null,
        attributed_revenue: attributedRevenue ? Number(attributedRevenue) : null,
      });
      setCampaigns((prev) => [...prev, campaign]);
      setCampaignName("");
      setInvestment("");
      setAttributedRevenue("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a campanha.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Link href={`/organizations/${id}`} className="text-sm text-zinc-500 underline dark:text-zinc-400">
        &larr; Voltar
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Marketing</h1>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Canais
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {channels.map((c) => (
            <li
              key={c.id}
              className="rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-800"
            >
              {c.name}
            </li>
          ))}
        </ul>
        <form onSubmit={handleCreateChannel} className="mt-3 flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Novo canal
            <input
              required
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Ex.: Google Ads"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Adicionar
          </button>
        </form>
      </section>

      <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Campanhas
        </h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Nome</th>
              <th className="py-2">Investimento</th>
              <th className="py-2">Receita atribuída</th>
              <th className="py-2">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{c.name}</td>
                <td className="py-2">{formatValue(c.investment)}</td>
                <td className="py-2">{formatValue(c.attributed_revenue)}</td>
                <td className="py-2">{formatValue(c.roas)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <form onSubmit={handleCreateCampaign} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Canal
            <select
              required
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="" disabled>
                Selecione
              </option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Nome da campanha
            <input
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Investimento
            <input
              type="number"
              step="0.01"
              value={investment}
              onChange={(e) => setInvestment(e.target.value)}
              className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Receita atribuída
            <input
              type="number"
              step="0.01"
              value={attributedRevenue}
              onChange={(e) => setAttributedRevenue(e.target.value)}
              className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || channels.length === 0}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? "Criando..." : "Adicionar campanha"}
          </button>
        </form>
      </section>
    </div>
  );
}
