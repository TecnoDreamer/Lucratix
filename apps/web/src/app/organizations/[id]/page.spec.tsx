import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { OrganizationProvider, type OrganizationContextValue } from "@/contexts/organization-context";
import type { Dashboard, MetricResult, PeriodComparison } from "@/lib/metrics";
import type { Organization } from "@/lib/types";
import OrganizationDetailPage from "./page";

const mockPush = vi.fn();
const mockRouter = { push: mockPush };

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => mockRouter,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

function metric(value: number | null, applicable = true): MetricResult {
  return { value, is_applicable: applicable, reason: applicable ? null : "sem dado no periodo" };
}

const FAKE_DASHBOARD: Dashboard = {
  revenue: metric(42850),
  profit: metric(15200),
  margin: metric(0.28),
  cac: metric(145.5),
  conversion_rate: metric(0.084),
  average_ticket: metric(320),
  recurrence_rate: metric(0.12),
};

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

function renderWithOrg(
  orgOverrides: Partial<Organization> = {},
  ctxOverrides: Partial<OrganizationContextValue> = {}
) {
  const value: OrganizationContextValue = {
    organization: fakeOrg(orgOverrides),
    loading: false,
    error: null,
    ...ctxOverrides,
  };
  return render(
    <OrganizationProvider value={value}>
      <OrganizationDetailPage />
    </OrganizationProvider>
  );
}

function mockApiGet(opts: {
  baselines?: unknown[];
  dashboard?: Dashboard;
  comparison?: PeriodComparison | null;
  quickAccess?: { id: string; enabled: boolean }[] | null;
}) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.includes("/compare-to-baseline")) {
      if (opts.comparison === null) {
        return Promise.reject(new ApiError(404, "sem baseline"));
      }
      return Promise.resolve(opts.comparison ?? null);
    }
    if (path.includes("/workspace-preferences")) {
      return Promise.resolve({
        organization_id: "org-123",
        quick_access: opts.quickAccess ?? null,
        updated_at: null,
      });
    }
    if (path.includes("/dashboard")) {
      return Promise.resolve(opts.dashboard ?? FAKE_DASHBOARD);
    }
    if (path.includes("/baselines")) {
      return Promise.resolve(opts.baselines ?? []);
    }
    return Promise.reject(new Error(`unexpected path ${path}`));
  });
}

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});

describe("OrganizationDetailPage — página inicial da empresa", () => {
  it("mostra o cabeçalho com nome, papel amigável e link para trocar de empresa", async () => {
    mockApiGet({ comparison: null });
    renderWithOrg({ name: "Empresa Teste", my_role: "ANALYST" });

    expect(screen.getByText("Empresa Teste")).toBeInTheDocument();
    expect(screen.getByText("Analista")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trocar empresa" })).toHaveAttribute("href", "/organizations");
  });

  it("mostra o resumo de KPIs do mês", async () => {
    mockApiGet({ comparison: null });
    renderWithOrg();

    await waitFor(() => {
      expect(screen.getByText("42.850")).toBeInTheDocument();
    });
  });

  it("mostra os 7 atalhos de acesso rápido apontando para rotas existentes", async () => {
    mockApiGet({ comparison: null });
    renderWithOrg();

    for (const [label, href] of [
      ["Analytics", "/organizations/org-123/analytics"],
      ["Financeiro", "/organizations/org-123/financials"],
      ["Marketing", "/organizations/org-123/marketing"],
      ["Funil", "/organizations/org-123/funnel"],
      ["Produtos", "/organizations/org-123/products"],
      ["Experimentos", "/organizations/org-123/experiments"],
      ["Central de Dados", "/organizations/org-123/central-de-dados"],
    ]) {
      await waitFor(() => {
        expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", href);
      });
    }
  });

  it("respeita ordem/visibilidade salva em preferência (VIEWER + preferência não pode ressuscitar Analytics)", async () => {
    mockApiGet({
      comparison: null,
      quickAccess: [
        { id: "marketing", enabled: true },
        { id: "analytics", enabled: true },
        { id: "financials", enabled: false },
      ],
    });
    renderWithOrg({ my_role: "VIEWER" });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Marketing/ })).toBeInTheDocument();
    });
    // Analytics exige ANALYST+: mesmo com enabled:true na preferência salva,
    // VIEWER nunca deve ver o card (regra estrutural de resolveQuickAccess).
    expect(screen.queryByRole("link", { name: /Analytics/ })).not.toBeInTheDocument();
    // Financeiro foi desabilitado na preferência.
    expect(screen.queryByRole("link", { name: /Financeiro/ })).not.toBeInTheDocument();
  });

  it("esconde o atalho de Analytics para VIEWER (exige ANALYST+ no backend)", async () => {
    mockApiGet({ comparison: null });
    renderWithOrg({ my_role: "VIEWER" });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Financeiro/ })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /Analytics/ })).not.toBeInTheDocument();
  });

  it("mostra ações rápidas para ANALYST, mas esconde para VIEWER", async () => {
    mockApiGet({ comparison: null });
    const { unmount } = renderWithOrg({ my_role: "ANALYST" });
    await waitFor(() => {
      expect(screen.getByText("Ações rápidas")).toBeInTheDocument();
    });
    unmount();

    mockApiGet({ comparison: null });
    renderWithOrg({ my_role: "VIEWER" });
    await waitFor(() => {
      expect(screen.getByText("Empresa Teste")).toBeInTheDocument();
    });
    expect(screen.queryByText("Ações rápidas")).not.toBeInTheDocument();
  });

  it("mostra alerta quando a receita caiu mais de 5% em relação ao baseline", async () => {
    mockApiGet({
      comparison: { baseline_value: 50000, current_value: 40000, absolute_change: -10000, percent_change: -0.2 },
    });
    renderWithOrg();

    await waitFor(() => {
      expect(screen.getByText(/Receita caiu 20%/)).toBeInTheDocument();
    });
  });

  it("não mostra alerta quando não há queda relevante", async () => {
    mockApiGet({
      comparison: { baseline_value: 50000, current_value: 51000, absolute_change: 1000, percent_change: 0.02 },
    });
    renderWithOrg();

    await waitFor(() => {
      expect(screen.getByText("42.850")).toBeInTheDocument();
    });
    expect(screen.queryByText("Atenção")).not.toBeInTheDocument();
  });

  it("preserva o histórico de baseline e o formulário de registro já existentes", async () => {
    mockApiGet({ comparison: null, baselines: [] });
    renderWithOrg();

    await waitFor(() => {
      expect(screen.getByText("Nenhum baseline registrado ainda.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Receita")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar baseline" })).toBeInTheDocument();
  });
});
