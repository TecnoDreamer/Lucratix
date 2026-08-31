import { formatMetric, type ChannelMarketing, type MetricResult } from "@/lib/metrics";
import { tableHead, tableRow } from "@/lib/ui";
import { Card } from "@/components/ui";

const COLUMNS: { key: keyof ChannelMarketing & string; label: string; percent?: boolean }[] = [
  { key: "roas", label: "ROAS" },
  { key: "roi", label: "ROI", percent: true },
  { key: "ctr", label: "CTR", percent: true },
  { key: "cpc", label: "CPC" },
  { key: "cpm", label: "CPM" },
  { key: "cpl", label: "CPL" },
  { key: "cpa", label: "CPA" },
];

/** Drill-down de Marketing por canal — mesmas 7 métricas do card agregado
 * acima, uma linha por canal. Sem estado vazio próprio: quando não há
 * campanha no período, o aviso já mostrado pela seção "Marketing" (`Nenhuma
 * campanha com data cadastrada...`) cobre o caso, sem duplicar mensagem. */
export function MarketingByChannelTable({ channels }: { channels: ChannelMarketing[] }) {
  if (channels.length === 0) return null;

  return (
    <Card className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={tableHead}>
            <th className="px-4 py-2.5">Canal</th>
            <th className="px-4 py-2.5">Campanhas</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-4 py-2.5">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => (
            <tr key={channel.channel_id} className={tableRow}>
              <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {channel.channel_name}
              </td>
              <td className="px-4 py-2.5">{channel.campaign_count}</td>
              {COLUMNS.map((c) => (
                <td key={c.key} className="px-4 py-2.5">
                  {formatMetric(channel[c.key] as MetricResult, { percent: c.percent })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
