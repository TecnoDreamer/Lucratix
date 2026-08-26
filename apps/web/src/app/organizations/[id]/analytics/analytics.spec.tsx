import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import type { ExecutiveDashboard, MarketingAnalytics } from "@/lib/metrics";
import AnalyticsPage from "./page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

function fakeMetric(value: number, percentChange: number | null = 0.1) {
  return {
    current: { value, is_applicable: true, reason: null },
    comparison: {
      baseline_value: percentChange === null ? null : value / (1 + percentChange),
      current_value: value,
      absolute_change: percentChange === null ? null : value * percentChange,
      percent_change: percentChange,
    },
  };
}

const FAKE_DASHBOARD: ExecutiveDashboard = {
  date_from: "2026-08-01",
  date_to: "2026-08-31",
  previous_date_from: "2026-07-01",
  previous_date_to: "2026-07-31",
  months_in_range: 1,
  months_with_financial_data: 1,
  months_with_funnel_data: 1,
  revenue: fakeMetric(58200, 0.124),
  profit: fakeMetric(20900, -0.05),
  margin: fakeMetric(0.359, null),
  cac: fakeMetric(133.33),
  conversion_rate: fakeMetric(0.07),
  average_ticket: fakeMetric(923.81),
  recurrence_rate: fakeMetric(0.333),
};

const FAKE_MARKETING: MarketingAnalytics = {
  date_from: "2026-08-01",
  date_to: "2026-08-31",
  previous_date_from: "2026-07-01",
  previous_date_to: "2026-07-31",
  campaign_count: 2,
  roas: fakeMetric(4.2, 0.2),
  roi: fakeMetric(3.2, 0.15),
  ctr: fakeMetric(0.05),
  cpc: fakeMetric(2.5),
  cpm: fakeMetric(100),
  cpl: fakeMetric(20),
  cpa: fakeMetric(100),
};

function mockApiByUrl(overrides?: { dashboard?: ExecutiveDashboard; marketing?: MarketingAnalytics }) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.includes("/analytics/marketing")) {
      return Promise.resolve(overrides?.marketing ?? FAKE_MARKETING);
    }
    return Promise.resolve(overrides?.dashboard ?? FAKE_DASHBOARD);
  });
}

afterEach(() => {
  cleanup();
  mockPush.mockReset();
  vi.mocked(api.get).mockReset();
});

describe("AnalyticsPage", () => {
  it("renderiza os 7 KPIs com o valor atual", async () => {
    mockApiByUrl();
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("58.200")).toBeInTheDocument();
    });
    expect(screen.getByText("35,9%")).toBeInTheDocument();
    expect(screen.getByText("133,33")).toBeInTheDocument();
  });

  it("mostra a variação percentual positiva e negativa", async () => {
    mockApiByUrl();
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("+12,4%")).toBeInTheDocument();
    });
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("sem dado no período anterior, mostra 'n/d' em vez de 0%", async () => {
    mockApiByUrl();
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/n\/d/)).toBeInTheDocument();
    });
  });

  it("dado incompleto no período mostra o aviso de completude", async () => {
    mockApiByUrl({ dashboard: { ...FAKE_DASHBOARD, months_in_range: 3, months_with_financial_data: 1 } });
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/1 de 3 meses/)).toBeInTheDocument();
    });
  });

  it("período completo não mostra aviso de completude", async () => {
    mockApiByUrl();
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("58.200")).toBeInTheDocument();
    });
    expect(screen.queryByText(/meses do período selecionado/)).not.toBeInTheDocument();
  });

  it("erro da API mostra mensagem", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(500, "Erro interno"));
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Erro interno")).toBeInTheDocument();
    });
  });

  it("trocar o preset refaz a chamada com o novo intervalo", async () => {
    mockApiByUrl();
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(4);
    });
  });

  it("renderiza os KPIs de marketing (ROAS, ROI, CTR, CPC, CPM, CPL, CPA)", async () => {
    mockApiByUrl();
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("4,2")).toBeInTheDocument();
    });
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("2,5")).toBeInTheDocument();
  });

  it("sem campanhas no período mostra aviso de dados insuficientes", async () => {
    mockApiByUrl({
      marketing: {
        ...FAKE_MARKETING,
        campaign_count: 0,
        roas: { current: { value: null, is_applicable: false, reason: "Sem campanhas no período" }, comparison: fakeMetric(0).comparison },
      },
    });
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/métricas de marketing não/)).toBeInTheDocument();
    });
  });
});
