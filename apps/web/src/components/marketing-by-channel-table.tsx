import { useTranslations } from "next-intl";
import { formatMetric, type ChannelMarketing, type MetricResult } from "@/lib/metrics";
import { tableHead, tableRow } from "@/lib/ui";
import { Card } from "@/components/ui";

const COLUMN_KEYS: { key: keyof ChannelMarketing & string; percent?: boolean }[] = [
  { key: "roas" },
  { key: "roi", percent: true },
  { key: "ctr", percent: true },
  { key: "cpc" },
  { key: "cpm" },
  { key: "cpl" },
  { key: "cpa" },
];

/** Drill-down de Marketing por canal — mesmas 7 métricas do card agregado
 * acima, uma linha por canal. Sem estado vazio próprio: quando não há
 * campanha no período, o aviso já mostrado pela seção "Marketing" (`Nenhuma
 * campanha com data cadastrada...`) cobre o caso, sem duplicar mensagem. */
export function MarketingByChannelTable({ channels }: { channels: ChannelMarketing[] }) {
  const t = useTranslations("common");
  // Mesmos rótulos de métrica de marketing usados em Analytics/Relatório —
  // evita traduzir "ROAS/ROI/CTR/..." em um quarto lugar.
  const tMetricLabels = useTranslations("analytics.metricLabels");
  if (channels.length === 0) return null;

  return (
    <Card className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={tableHead}>
            <th className="px-4 py-2.5">{t("channel")}</th>
            <th className="px-4 py-2.5">{t("campaigns")}</th>
            {COLUMN_KEYS.map((c) => (
              <th key={c.key} className="px-4 py-2.5">
                {tMetricLabels(c.key)}
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
              {COLUMN_KEYS.map((c) => (
                <td key={c.key} className="px-4 py-2.5">
                  {formatMetric(channel[c.key] as MetricResult, {
                    percent: c.percent,
                    notApplicableLabel: t("notApplicable"),
                  })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
