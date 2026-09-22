import { describe, expect, it } from "vitest";
import { computeMarketingInsights, findBestChannel } from "./marketing-insights";
import type { ChannelMarketing } from "./metrics";
import type { MetricResult } from "./metrics";

const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });
const notApplicable: MetricResult = { value: null, is_applicable: false, reason: "divisao por zero: investment" };

function channel(id: string, name: string, roas: MetricResult): ChannelMarketing {
  return {
    channel_id: id,
    channel_name: name,
    campaign_count: 1,
    roas,
    roi: notApplicable,
    ctr: notApplicable,
    cpc: notApplicable,
    cpm: notApplicable,
    cpl: notApplicable,
    cpa: notApplicable,
  };
}

const COPY = {
  title: "channel-title",
  context: (channelName: string) => `channel-context:${channelName}`,
  cta: "channel-cta",
};

describe("findBestChannel", () => {
  it("acha o canal com maior ROAS aplicável", () => {
    const channels = [
      channel("a", "Google Ads", applicable(2.4)),
      channel("b", "Instagram Ads", applicable(3.1)),
    ];
    expect(findBestChannel(channels)?.channel_name).toBe("Instagram Ads");
  });

  it("ignora canais sem ROAS aplicável", () => {
    const channels = [channel("a", "Google Ads", notApplicable), channel("b", "Orgânico", applicable(1.5))];
    expect(findBestChannel(channels)?.channel_name).toBe("Orgânico");
  });

  it("null quando nenhum canal tem ROAS aplicável", () => {
    expect(findBestChannel([channel("a", "Google Ads", notApplicable)])).toBeNull();
  });
});

describe("computeMarketingInsights", () => {
  it("gera o insight de contribuição por canal com evidência e período", () => {
    const channels = [channel("a", "Google Ads", applicable(2.4)), channel("b", "Instagram Ads", applicable(3.1))];
    const insights = computeMarketingInsights(channels, COPY, "ago/2026");
    expect(insights).toHaveLength(1);
    expect(insights[0].kind).toBe("channel_contribution");
    expect(insights[0].tone).toBe("positive");
    expect(insights[0].evidence).toContain("Instagram Ads");
    expect(insights[0].evidence).toContain("3,1");
    expect(insights[0].period).toBe("ago/2026");
    expect(insights[0].context).toBe("channel-context:Instagram Ads");
  });

  it("sem canal com ROAS aplicável, não gera insight nenhum", () => {
    expect(computeMarketingInsights([channel("a", "Google Ads", notApplicable)], COPY)).toEqual([]);
  });

  it("sem canal nenhum, não gera insight nenhum", () => {
    expect(computeMarketingInsights([], COPY)).toEqual([]);
  });
});
