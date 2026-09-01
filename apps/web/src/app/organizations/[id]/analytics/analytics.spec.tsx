import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { OrganizationProvider, type OrganizationContextValue } from "@/contexts/organization-context";
import { formatCompactNumber } from "@/lib/formatters";
import type {
  ExecutiveCorrelation,
  ExecutiveDashboard,
  ExecutiveSeries,
  ExecutiveTargets,
  MarketingAnalytics,
  MarketingByChannel,
  Target,
} from "@/lib/metrics";
import type { Organization } from "@/lib/types";
import AnalyticsPage from "./page";

const mockPush = vi.fn();
const mockTriggerBrowserDownload = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), put: vi.fn(), del: vi.fn() } };
});

// Mesmo padrão de export-panel.spec.tsx (mockar downloadFile): o
// componente só precisa disparar o download do browser, o que não é o que
// este teste verifica — verifica-se o Blob/nome de arquivo passados.
vi.mock("@/lib/browser-download", () => ({
  triggerBrowserDownload: (...args: unknown[]) => mockTriggerBrowserDownload(...args),
}));

function fakeResult(value: number, isApplicable = true) {
  return { value: isApplicable ? value : null, is_applicable: isApplicable, reason: isApplicable ? null : "Sem dado" };
}

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
  cac: fakeMetric(133.33, 0.083), // valor distinto de propósito — CAC subir é uma má notícia (lower_is_better)
  conversion_rate: fakeMetric(0.07),
  average_ticket: fakeMetric(923.81),
  recurrence_rate: fakeMetric(0.333),
};

const FAKE_SERIES: ExecutiveSeries = {
  date_from: "2026-07-01",
  date_to: "2026-08-31",
  points: [
    {
      period: "2026-07-01",
      revenue: fakeResult(50000),
      profit: fakeResult(18000),
      margin: fakeResult(0.36),
      cac: fakeResult(120),
      conversion_rate: fakeResult(0.06),
      average_ticket: fakeResult(900),
      recurrence_rate: fakeResult(0.3),
    },
    {
      period: "2026-08-01",
      revenue: fakeResult(58200),
      profit: fakeResult(20900),
      margin: fakeResult(0.359),
      cac: fakeResult(133.33),
      conversion_rate: fakeResult(0.07),
      average_ticket: fakeResult(923.81),
      recurrence_rate: fakeResult(0.333),
    },
  ],
};

function notApplicableProgress(reason: string) {
  return { target_value: null, percent_of_target: { value: null, is_applicable: false, reason } };
}

// Cenário padrão: nenhuma meta definida — mesmo comportamento de antes
// desta feature existir (nenhum "% da meta" nem linha tracejada).
const FAKE_TARGETS: ExecutiveTargets = {
  date_from: "2026-07-01",
  date_to: "2026-08-31",
  revenue: notApplicableProgress("dado ausente: target"),
  profit: notApplicableProgress("dado ausente: target"),
  margin: notApplicableProgress("meta não agregável"),
  cac: notApplicableProgress("meta não agregável"),
  conversion_rate: notApplicableProgress("meta não agregável"),
  average_ticket: notApplicableProgress("meta não agregável"),
  recurrence_rate: notApplicableProgress("meta não agregável"),
  monthly: [
    {
      period: "2026-07-01",
      revenue: null,
      profit: null,
      margin: null,
      cac: null,
      conversion_rate: null,
      average_ticket: null,
      recurrence_rate: null,
    },
    {
      period: "2026-08-01",
      revenue: null,
      profit: null,
      margin: null,
      cac: null,
      conversion_rate: null,
      average_ticket: null,
      recurrence_rate: null,
    },
  ],
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

const FAKE_MARKETING_BY_CHANNEL: MarketingByChannel = {
  date_from: "2026-08-01",
  date_to: "2026-08-31",
  channels: [
    {
      channel_id: "channel-1",
      channel_name: "Google Ads",
      campaign_count: 2,
      // Valores propositalmente diferentes dos de FAKE_MARKETING (o
      // agregado) — evita colisão de texto entre o card de KPI e a linha
      // da tabela de canal nos testes que checam ambos na mesma página.
      roas: fakeResult(6.1),
      roi: fakeResult(0.45),
      ctr: fakeResult(0.08),
      cpc: fakeResult(3.3),
      cpm: fakeResult(150),
      cpl: fakeResult(35),
      cpa: fakeResult(220),
    },
  ],
};

const FAKE_CORRELATION: ExecutiveCorrelation = {
  date_from: "2026-08-01",
  date_to: "2026-08-31",
  metric_x: "revenue",
  metric_y: "cac",
  months_used: 3,
  correlation: { value: 0.85, is_applicable: true, reason: null },
  points: [
    { period: "2026-06-01", x: 10000, y: 100 },
    { period: "2026-07-01", x: 20000, y: 90 },
    { period: "2026-08-01", x: 30000, y: 80 },
  ],
};

function mockApiByUrl(overrides?: {
  dashboard?: ExecutiveDashboard;
  series?: ExecutiveSeries;
  targets?: ExecutiveTargets;
  rawTargets?: Target[];
  marketing?: MarketingAnalytics;
  marketingByChannel?: MarketingByChannel;
  correlation?: ExecutiveCorrelation;
}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    // Ordem importa: várias rotas contêm um prefixo mais curto de outra
    // como substring ("/analytics/marketing/by-channel" contém
    // "/analytics/marketing"; "/analytics/executive/targets", "/.../series"
    // e "/.../correlation" contêm "/analytics/executive") — checar sempre a
    // mais específica primeiro. "/targets" no fim (sem query string) é a
    // lista bruta que TargetsPanel busca, diferente de
    // "/analytics/executive/targets" (progresso agregado, com query string
    // de data).
    if (url.includes("/analytics/executive/targets")) {
      return Promise.resolve(overrides?.targets ?? FAKE_TARGETS);
    }
    if (url.includes("/analytics/executive/series")) {
      return Promise.resolve(overrides?.series ?? FAKE_SERIES);
    }
    if (url.includes("/analytics/executive/correlation")) {
      return Promise.resolve(overrides?.correlation ?? FAKE_CORRELATION);
    }
    if (url.includes("/analytics/marketing/by-channel")) {
      return Promise.resolve(overrides?.marketingByChannel ?? FAKE_MARKETING_BY_CHANNEL);
    }
    if (url.includes("/analytics/marketing")) {
      return Promise.resolve(overrides?.marketing ?? FAKE_MARKETING);
    }
    if (url.includes("/analytics/executive")) {
      return Promise.resolve(overrides?.dashboard ?? FAKE_DASHBOARD);
    }
    if (url.endsWith("/targets")) {
      return Promise.resolve(overrides?.rawTargets ?? []);
    }
    return Promise.resolve(overrides?.dashboard ?? FAKE_DASHBOARD);
  });
}

function fakeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "org-123",
    name: "Empresa Teste",
    trade_name: null,
    segment: null,
    cnpj: null,
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    tracking_start_date: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    my_role: "ORGANIZATION_OWNER",
    ...overrides,
  };
}

function renderPage(ctxOverrides: Partial<OrganizationContextValue> = {}) {
  const value: OrganizationContextValue = { organization: fakeOrg(), loading: false, error: null, ...ctxOverrides };
  return render(
    <OrganizationProvider value={value}>
      <AnalyticsPage />
    </OrganizationProvider>
  );
}

// Todos os mocks de API deste arquivo usam agosto/2026 como período fixo
// (date_from/date_to, dados mensais) — o preset padrão da página (sem
// período explícito na URL) usa currentMonthPeriod() com a data real do
// relógio, então sem fixar o relógio aqui o teste do nome do arquivo
// exportado quebra sozinho a cada virada de mês (já aconteceu: a suíte foi
// escrita quando "hoje" caía em agosto).
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mockPush.mockReset();
  mockTriggerBrowserDownload.mockReset();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.del).mockReset();
});

describe("AnalyticsPage", () => {
  it("renderiza os 7 KPIs com o valor atual", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("58.200")).toBeInTheDocument();
    });
    // selector: "p" restringe ao texto do card de KPI — a tabela sr-only do
    // gráfico de evolução (mês a mês) pode formatar um ponto da série com o
    // mesmo texto por coincidência (ex.: mesma margem arredondada).
    expect(screen.getByText("35,9%", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("133,33", { selector: "p" })).toBeInTheDocument();
  });

  it("mostra a variação percentual positiva e negativa", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("+12,4%")).toBeInTheDocument();
    });
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("sem dado no período anterior, mostra 'n/d' em vez de 0%", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/n\/d/)).toBeInTheDocument();
    });
  });

  it("dado incompleto no período mostra o aviso de completude", async () => {
    mockApiByUrl({ dashboard: { ...FAKE_DASHBOARD, months_in_range: 3, months_with_financial_data: 1 } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/1 de 3 meses/)).toBeInTheDocument();
    });
  });

  it("período completo não mostra aviso de completude", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("58.200")).toBeInTheDocument();
    });
    expect(screen.queryByText(/meses do período selecionado/)).not.toBeInTheDocument();
  });

  it("erro da API mostra mensagem", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(500, "Erro interno"));
    renderPage();

    // Duas seções buscam dado de forma independente (a página e o
    // TargetsPanel) — cada uma mostra seu próprio erro quando falha.
    await waitFor(() => {
      expect(screen.getAllByText("Erro interno").length).toBeGreaterThan(0);
    });
  });

  it("trocar o preset refaz a chamada com o novo intervalo", async () => {
    mockApiByUrl();
    renderPage();

    // 6 chamadas dependentes do período (executive, series, targets
    // agregados, marketing, marketing por canal, correlação — essa última
    // do CorrelationPanel, que também depende de dateFrom/dateTo) + 1 do
    // TargetsPanel (lista bruta de metas, que não depende do período —
    // busca só uma vez, no mount).
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(7);
    });

    fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(13);
    });
  });

  it("renderiza os gráficos de evolução mensal com os meses da série", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Evolução mensal")).toBeInTheDocument();
    });
    // Um gráfico por KPI (7), cada um com rótulos de mês no eixo X (SVG
    // <text>) — confirma que os dados da série chegaram ao componente. A
    // tabela sr-only de cada gráfico repete o mesmo mês em <td>, por isso
    // o selector restringe ao eixo visual.
    expect(screen.getAllByText("jul/26", { selector: "text" }).length).toBe(7);
    expect(screen.getAllByText("ago/26", { selector: "text" }).length).toBe(7);
  });

  it("cada gráfico de evolução tem nome acessível e tabela alternativa para leitor de tela", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Receita — evolução mensal" })).toBeInTheDocument();
    });
    // Gráfico não é a única representação: tabela sr-only com os mesmos
    // dados mês a mês, para quem usa leitor de tela.
    expect(screen.getByText("Receita — evolução mensal, por mês")).toBeInTheDocument();
    const table = screen.getByText("Receita — evolução mensal, por mês").closest("table");
    expect(table).not.toBeNull();
    expect(table).toHaveClass("sr-only");
  });

  it("mês sem dado na série não quebra o gráfico (buraco, não zero)", async () => {
    mockApiByUrl({
      series: {
        ...FAKE_SERIES,
        points: [
          FAKE_SERIES.points[0],
          {
            ...FAKE_SERIES.points[1],
            revenue: { value: null, is_applicable: false, reason: "Sem dado" },
          },
        ],
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Evolução mensal")).toBeInTheDocument();
    });
    // O mês sem dado não faz o gráfico quebrar nem some da lista de meses no
    // eixo X — só não desenha ponto/linha ali (buraco, RN-003).
    expect(screen.getAllByText("ago/26", { selector: "text" }).length).toBe(7);
  });

  it("cor da variação respeita a direção da métrica — CAC subir é ruim mesmo sendo uma variação positiva", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("+12,4%")).toBeInTheDocument();
    });
    // Receita subir é bom (higher_is_better) → verde.
    expect(screen.getByText("+12,4%").closest("p")).toHaveClass("text-emerald-600");
    // Lucro cair é ruim (higher_is_better) → vermelho.
    expect(screen.getByText("-5%").closest("p")).toHaveClass("text-rose-600");
    // CAC subir é ruim (lower_is_better) mesmo com percent_change positivo
    // — o bug que este teste existe pra prevenir era pintar isso de verde.
    expect(screen.getByText("+8,3%").closest("p")).toHaveClass("text-rose-600");
  });

  it("mostra observações determinísticas quando o dado sustenta (receita subiu, CAC caiu)", async () => {
    mockApiByUrl({
      dashboard: {
        ...FAKE_DASHBOARD,
        revenue: fakeMetric(58200, 0.124),
        cac: fakeMetric(100, -0.1),
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Receita cresceu \+12,4% enquanto o CAC caiu 10%/)).toBeInTheDocument();
    });
  });

  it("sem nenhuma comparação aplicável, não mostra painel de observações", async () => {
    mockApiByUrl({
      dashboard: {
        ...FAKE_DASHBOARD,
        revenue: { current: { value: null, is_applicable: false, reason: "Sem dado" }, comparison: { baseline_value: null, current_value: null, absolute_change: null, percent_change: null } },
        profit: { current: { value: null, is_applicable: false, reason: "Sem dado" }, comparison: { baseline_value: null, current_value: null, absolute_change: null, percent_change: null } },
        margin: { current: { value: null, is_applicable: false, reason: "Sem dado" }, comparison: { baseline_value: null, current_value: null, absolute_change: null, percent_change: null } },
        cac: { current: { value: null, is_applicable: false, reason: "Sem dado" }, comparison: { baseline_value: null, current_value: null, absolute_change: null, percent_change: null } },
        conversion_rate: { current: { value: null, is_applicable: false, reason: "Sem dado" }, comparison: { baseline_value: null, current_value: null, absolute_change: null, percent_change: null } },
        average_ticket: { current: { value: null, is_applicable: false, reason: "Sem dado" }, comparison: { baseline_value: null, current_value: null, absolute_change: null, percent_change: null } },
        recurrence_rate: { current: { value: null, is_applicable: false, reason: "Sem dado" }, comparison: { baseline_value: null, current_value: null, absolute_change: null, percent_change: null } },
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("não aplicável").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/teve a maior variação do período/)).not.toBeInTheDocument();
  });

  it("botão 'Exportar CSV' baixa a série com metadado de empresa, período e fuso horário", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Exportar CSV/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    await waitFor(() => {
      expect(mockTriggerBrowserDownload).toHaveBeenCalledTimes(1);
    });
    const [blob, filename] = mockTriggerBrowserDownload.mock.calls[0];
    expect(filename).toBe("visao_executiva_2026-08-01_2026-08-31.csv");
    const content = await blob.text();
    expect(content).toContain("Empresa,Empresa Teste");
    expect(content).toContain("Mês,Receita,Lucro,Margem,CAC,Conversão,Ticket médio,Recorrência");
    expect(content).toContain("2026-07-01,50000");
  });

  it("mostra o progresso da meta de receita no card do KPI", async () => {
    mockApiByUrl({
      targets: {
        ...FAKE_TARGETS,
        revenue: {
          target_value: 60000,
          percent_of_target: { value: 58200 / 60000, is_applicable: true, reason: null },
        },
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/97%/)).toBeInTheDocument();
    });
    expect(screen.getByText(/da meta/)).toBeInTheDocument();
  });

  it("métrica sem progresso agregado de meta (razão, ex.: margem) não mostra '% da meta'", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("58.200")).toBeInTheDocument();
    });
    expect(screen.queryByText(/da meta/)).not.toBeInTheDocument();
  });

  it("linha de meta do gráfico de evolução usa o valor mensal bruto (não o agregado)", async () => {
    mockApiByUrl({
      targets: {
        ...FAKE_TARGETS,
        monthly: [
          { ...FAKE_TARGETS.monthly[0], revenue: 52000 },
          { ...FAKE_TARGETS.monthly[1], revenue: 60000 },
        ],
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Evolução mensal")).toBeInTheDocument();
    });
    const table = screen.getByText("Receita — evolução mensal, por mês").closest("table")!;
    const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) => tr.textContent ?? "");
    expect(rows[0]).toContain(formatCompactNumber(52000));
    expect(rows[1]).toContain(formatCompactNumber(60000));
  });

  it("renderiza a seção de Metas com o formulário e a lista de metas já definidas", async () => {
    mockApiByUrl({ rawTargets: [] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Metas")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Métrica")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar meta" })).toBeInTheDocument();
  });

  it("renderiza a seção de Correlação com o coeficiente calculado", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Correlação entre métricas")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Correlação forte positiva/)).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Métrica X")).toBeInTheDocument();
    expect(screen.getByLabelText("Métrica Y")).toBeInTheDocument();
  });

  it("salvar uma meta rebusca o progresso agregado, sem esperar o período mudar", async () => {
    mockApiByUrl({ rawTargets: [] });
    vi.mocked(api.put).mockResolvedValue({
      id: "t1",
      organization_id: "org-123",
      metric: "revenue",
      period: "2026-08-01",
      value: 60000,
      created_by: null,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Metas")).toBeInTheDocument();
    });
    // 5 chamadas do carregamento inicial (4 da página + 1 do TargetsPanel).
    const callsBeforeSave = vi.mocked(api.get).mock.calls.length;

    fireEvent.change(screen.getByLabelText(/^Meta/), { target: { value: "60000" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalled();
    });
    // refetchTargets busca de novo /analytics/executive/targets — mais uma
    // chamada de GET, sem trocar o período nem recarregar a página inteira.
    await waitFor(() => {
      expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(callsBeforeSave);
    });
    const targetsCalls = vi
      .mocked(api.get)
      .mock.calls.filter(([url]) => (url as string).includes("/analytics/executive/targets"));
    expect(targetsCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("renderiza os KPIs de marketing (ROAS, ROI, CTR, CPC, CPM, CPL, CPA)", async () => {
    mockApiByUrl();
    renderPage();

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
      marketingByChannel: { ...FAKE_MARKETING_BY_CHANNEL, channels: [] },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/métricas de marketing não/)).toBeInTheDocument();
    });
    // Sem canal nenhum, a tabela de drill-down não renderiza (evita
    // duplicar o aviso já mostrado acima).
    expect(screen.queryByText("Por canal")).not.toBeInTheDocument();
  });

  it("renderiza a tabela de Marketing por canal com uma linha por canal", async () => {
    mockApiByUrl();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Por canal")).toBeInTheDocument();
    });
    expect(screen.getByText("Google Ads")).toBeInTheDocument();
  });
});
