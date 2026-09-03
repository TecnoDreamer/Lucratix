import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FunnelByChannelTable } from "./funnel-by-channel-table";
import type { ChannelFunnel } from "@/lib/funnel-metrics";
import type { MetricResult } from "@/lib/metrics";

afterEach(() => cleanup());

const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });
const missing: MetricResult = { value: null, is_applicable: false, reason: "dado ausente" };

function channel(id: string, name: string, leads: number, customers: number): ChannelFunnel {
  return {
    channel_id: id,
    channel_name: name,
    stages: {
      impressions: missing,
      visits: missing,
      leads: applicable(leads),
      mqls: missing,
      sqls: missing,
      opportunities: missing,
      customers: applicable(customers),
      repeat_purchases: missing,
    },
    conversions: [],
  };
}

describe("FunnelByChannelTable", () => {
  it("nao renderiza nada quando nao ha canais", () => {
    const { container } = render(<FunnelByChannelTable channels={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza uma secao por canal, com resumo de leads/clientes fechado por padrao", () => {
    const channels = [channel("1", "Google Ads", 300, 20), channel("2", "Instagram", 200, 10)];
    render(<FunnelByChannelTable channels={channels} />);
    expect(screen.getByText("Google Ads")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("Leads: 300 · Clientes: 20")).toBeInTheDocument();
  });
});
