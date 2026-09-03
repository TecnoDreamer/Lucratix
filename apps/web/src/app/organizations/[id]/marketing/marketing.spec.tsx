import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { ChannelMarketing, MarketingByChannel } from "@/lib/metrics";
import MarketingPage from "./page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

const CAMPAIGN: import("@/lib/business").Campaign = {
  id: "camp-1",
  organization_id: "org-123",
  channel_id: "chan-1",
  name: "Campanha Google Setembro",
  start_date: "2026-09-01",
  end_date: "2026-09-15",
  investment: 1000,
  impressions: null,
  clicks: null,
  leads: null,
  opportunities: null,
  customers: null,
  attributed_revenue: 5000,
  roas: 5,
  ctr: null,
};

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  mockPush.mockReset();
});

const applicable = (value: number) => ({ value, is_applicable: true, reason: null });

const CHANNEL: ChannelMarketing = {
  channel_id: "chan-1",
  channel_name: "Google Ads",
  campaign_count: 2,
  roas: applicable(3.5),
  roi: applicable(1.5),
  ctr: applicable(0.02),
  cpc: applicable(1.2),
  cpm: applicable(10),
  cpl: applicable(5),
  cpa: applicable(30),
};

function mockApiGet(channels: ChannelMarketing[]) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.includes("/marketing-channels")) return Promise.resolve([]);
    if (path.includes("/campaigns")) return Promise.resolve([]);
    if (path.includes("/by-channel")) {
      const result: MarketingByChannel = { date_from: "2026-06-01", date_to: "2026-06-30", channels };
      return Promise.resolve(result);
    }
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

describe("MarketingPage — Desempenho por Canal (PR4)", () => {
  it("mostra o gráfico de ROAS por canal e a tabela quando há canal com campanha no período", async () => {
    mockApiGet([CHANNEL]);
    render(<MarketingPage />);

    expect(await screen.findByRole("img", { name: "ROAS por Canal" })).toBeInTheDocument();
    expect(screen.getAllByText("Google Ads").length).toBeGreaterThan(0);
  });

  it("sem nenhum canal com campanha no período, mostra o estado vazio em vez do gráfico", async () => {
    mockApiGet([]);
    render(<MarketingPage />);

    expect(await screen.findByText("Nenhum canal com campanha neste período")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "ROAS por Canal" })).not.toBeInTheDocument();
  });

  it("atualiza o desempenho por canal ao criar uma campanha, sem esperar troca de filtro", async () => {
    // Regressão encontrada na verificação manual desta PR: o painel só
    // reagia a `range`, então uma campanha recém-criada no período já
    // selecionado ficava invisível até o usuário mexer no filtro/recarregar.
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("/marketing-channels")) {
        return Promise.resolve([{ id: "chan-1", organization_id: "org-123", name: "Google Ads" }]);
      }
      if (path.includes("/campaigns")) return Promise.resolve([]);
      if (path.includes("/by-channel")) {
        const channels = vi.mocked(api.post).mock.calls.length > 0 ? [CHANNEL] : [];
        const result: MarketingByChannel = { date_from: "2026-09-01", date_to: "2026-09-30", channels };
        return Promise.resolve(result);
      }
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
    vi.mocked(api.post).mockResolvedValue(CAMPAIGN);

    render(<MarketingPage />);
    await screen.findByText("Nenhum canal com campanha neste período");

    fireEvent.change(screen.getByLabelText("Canal"), { target: { value: "chan-1" } });
    fireEvent.change(screen.getByLabelText("Nome da campanha"), {
      target: { value: "Campanha Google Setembro" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar campanha/ }));

    expect(await screen.findByRole("img", { name: "ROAS por Canal" })).toBeInTheDocument();
  });
});
