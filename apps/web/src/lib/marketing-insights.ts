/** Observação estruturada sobre desempenho por canal — mesmo espírito de
 * `lib/insights.ts`/`lib/funnel-insights.ts`. Extraído do texto que já
 * existia embutido em `marketing/page.tsx` (nota abaixo do gráfico de ROAS
 * por canal), agora reutilizável e testável — mesmo dado, mesmo critério
 * (maior ROAS aplicável), só reorganizado em tipo puro + i18n.
 */

import { formatDecimal } from "@/lib/formatters";
import type { ChannelMarketing } from "@/lib/metrics";
import type { Insight } from "@/lib/insights";

/** Canal com o maior ROAS aplicável no período — `null` sem nenhum canal
 * com ROAS calculável (sem investimento registrado, por exemplo). */
export function findBestChannel(channels: ChannelMarketing[]): ChannelMarketing | null {
  const applicable = channels.filter((c) => c.roas.is_applicable && c.roas.value !== null);
  if (applicable.length === 0) return null;
  return applicable.reduce((max, curr) => (curr.roas.value! > max.roas.value! ? curr : max));
}

export interface ChannelContributionCopy {
  title: string;
  context: (channel: string) => string;
  cta: string;
}

export function computeMarketingInsights(
  channels: ChannelMarketing[],
  copy: ChannelContributionCopy,
  period?: string
): Insight[] {
  const best = findBestChannel(channels);
  if (!best) return [];
  return [
    {
      id: "channel-contribution",
      kind: "channel_contribution",
      tone: "positive",
      title: copy.title,
      evidence: `${best.channel_name}: ROAS ${formatDecimal(best.roas.value!)}`,
      period,
      context: copy.context(best.channel_name),
      cta: copy.cta,
    },
  ];
}
