import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ChannelMarketing } from "@/lib/metrics";
import { MarketingByChannelTable } from "./marketing-by-channel-table";

afterEach(() => cleanup());

function metric(value: number | null, isApplicable = true) {
  return { value, is_applicable: isApplicable, reason: isApplicable ? null : "dado ausente" };
}

function channel(overrides: Partial<ChannelMarketing> = {}): ChannelMarketing {
  return {
    channel_id: "ch-1",
    channel_name: "Google Ads",
    campaign_count: 2,
    roas: metric(4.2),
    roi: metric(3.2),
    ctr: metric(0.05),
    cpc: metric(2.5),
    cpm: metric(100),
    cpl: metric(20),
    cpa: metric(100),
    ...overrides,
  };
}

describe("MarketingByChannelTable", () => {
  it("sem canais, não renderiza nada (evita duplicar o aviso já mostrado pela seção Marketing)", () => {
    const { container } = render(<MarketingByChannelTable channels={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza uma linha por canal com as 7 métricas", () => {
    render(
      <MarketingByChannelTable
        channels={[channel(), channel({ channel_id: "ch-2", channel_name: "Instagram", roas: metric(6.5) })]}
      />
    );

    expect(screen.getByText("Google Ads")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("4,2")).toBeInTheDocument();
    expect(screen.getByText("6,5")).toBeInTheDocument();
  });

  it("métrica percentual (ROI, CTR) é formatada como percentual", () => {
    render(<MarketingByChannelTable channels={[channel({ roi: metric(0.32) })]} />);
    expect(screen.getByText("32%")).toBeInTheDocument();
  });

  it("métrica não aplicável mostra 'não aplicável', nunca um valor inventado", () => {
    render(<MarketingByChannelTable channels={[channel({ cpc: metric(null, false) })]} />);
    expect(screen.getByText("não aplicável")).toBeInTheDocument();
  });

  it("mostra o número de campanhas de cada canal", () => {
    render(<MarketingByChannelTable channels={[channel({ campaign_count: 5 })]} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
