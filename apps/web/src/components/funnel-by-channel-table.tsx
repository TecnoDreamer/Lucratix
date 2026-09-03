import { useTranslations } from "next-intl";
import { formatMetric } from "@/lib/metrics";
import type { ChannelFunnel } from "@/lib/funnel-metrics";
import { AccordionItem } from "@/components/accordion-item";
import { FunnelStagesChart } from "@/components/funnel-stages-chart";
import { StageConversionChart } from "@/components/stage-conversion-chart";

/** Drill-down do Funil por canal — mesmo critério de
 * `MarketingByChannelTable` (uma seção por canal, sem comparação de
 * período: o eixo aqui é canal A vs. canal B), mas expansível (via
 * `AccordionItem`, já usado em Glossário/FAQ) em vez de uma linha de
 * tabela fixa — as 8 etapas + 7 conversões de um canal não cabem
 * legivelmente numa única linha. */
export function FunnelByChannelTable({ channels }: { channels: ChannelFunnel[] }) {
  const t = useTranslations("funnel.analytics");
  const tFields = useTranslations("funnel.fields");
  const tCommon = useTranslations("common");

  if (channels.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      {channels.map((channel) => {
        const leads = formatMetric(channel.stages.leads, { notApplicableLabel: tCommon("notApplicable") });
        const customers = formatMetric(channel.stages.customers, { notApplicableLabel: tCommon("notApplicable") });
        return (
          <AccordionItem
            key={channel.channel_id}
            title={channel.channel_name}
            subtitle={t("channelSummary", { leads, customers })}
          >
            <FunnelStagesChart stages={channel.stages} label={channel.channel_name} />
            <div className="mt-4">
              <StageConversionChart conversions={channel.conversions} tFields={tFields} />
            </div>
          </AccordionItem>
        );
      })}
    </div>
  );
}
