"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { formatValue, type Campaign, type MarketingChannel } from "@/lib/business";
import {
  buttonPrimary,
  buttonSecondary,
  input,
  label,
  select as selectClass,
  sectionTitle,
  tableHead,
  tableRow,
} from "@/lib/ui";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui";
import { IconMegaphone, IconPlus } from "@/components/icons";

async function fetchData(
  id: string
): Promise<{ channels: MarketingChannel[]; campaigns: Campaign[] }> {
  // Independentes entre si: rodam em paralelo em vez de em fila.
  const [channels, campaigns] = await Promise.all([
    api.get<MarketingChannel[]>(`/api/v1/organizations/${id}/marketing-channels`),
    api.get<Campaign[]>(`/api/v1/organizations/${id}/campaigns`),
  ]);
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

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconMegaphone className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Marketing</h2>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Canais</h3>
        {loading ? (
          <Skeleton className="mt-2 h-9 w-full" />
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {channels.map((c) => (
              <li
                key={c.id}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-300"
              >
                {c.name}
              </li>
            ))}
            {channels.length === 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum canal cadastrado ainda.
              </span>
            )}
          </ul>
        )}
        <form onSubmit={handleCreateChannel} className="mt-3 flex items-end gap-2">
          <label className={label}>
            Novo canal
            <input
              required
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Ex.: Google Ads"
              className={input}
            />
          </label>
          <button type="submit" className={buttonSecondary}>
            Adicionar
          </button>
        </form>
      </section>

      <section className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Campanhas</h3>

        <div className="mt-2">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : campaigns.length === 0 ? (
            <EmptyState title="Nenhuma campanha registrada ainda." />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHead}>
                    <th className="px-4 py-2.5">Nome</th>
                    <th className="px-4 py-2.5">Investimento</th>
                    <th className="px-4 py-2.5">Receita atribuída</th>
                    <th className="px-4 py-2.5">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className={tableRow}>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                        {c.name}
                      </td>
                      <td className="px-4 py-2.5">{formatValue(c.investment)}</td>
                      <td className="px-4 py-2.5">{formatValue(c.attributed_revenue)}</td>
                      <td className="px-4 py-2.5">{formatValue(c.roas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card className="mt-4 p-5">
          <form onSubmit={handleCreateCampaign} className="flex flex-wrap items-end gap-3">
            <label className={label}>
              Canal
              <select
                required
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className={selectClass}
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
            <label className={label}>
              Nome da campanha
              <input
                required
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className={input}
              />
            </label>
            <label className={label}>
              Investimento
              <input
                type="number"
                step="0.01"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                className={`${input} w-28`}
              />
            </label>
            <label className={label}>
              Receita atribuída
              <input
                type="number"
                step="0.01"
                value={attributedRevenue}
                onChange={(e) => setAttributedRevenue(e.target.value)}
                className={`${input} w-28`}
              />
            </label>
            <button
              type="submit"
              disabled={submitting || channels.length === 0}
              className={buttonPrimary}
            >
              <IconPlus className="h-4 w-4" />
              {submitting ? "Criando..." : "Adicionar campanha"}
            </button>
          </form>
        </Card>
      </section>
    </div>
  );
}
