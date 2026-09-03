import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizationProvider, type OrganizationContextValue } from "@/contexts/organization-context";
import type { Organization } from "@/lib/types";
import type { UseDashboardResult } from "@/hooks/use-dashboard";
import DashboardPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
}));

const mockUseDashboard = vi.fn<() => UseDashboardResult>();
vi.mock("@/hooks/use-dashboard", () => ({
  useDashboard: () => mockUseDashboard(),
}));

const applicable = (value: number) => ({ value, is_applicable: true, reason: null });

const DASHBOARD_RESULT: UseDashboardResult = {
  dashboard: {
    revenue: applicable(10000),
    profit: applicable(4000),
    margin: applicable(0.4),
    cac: applicable(50),
    conversion_rate: applicable(0.1),
    average_ticket: applicable(200),
    recurrence_rate: applicable(0.2),
  },
  revenueComparison: null,
  loading: false,
  error: null,
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
    status: "active",
    closed_at: null,
    closure_reason: null,
    logo_url: null,
    my_role: "ORGANIZATION_OWNER",
    ...overrides,
  };
}

function renderWithRole(role: Organization["my_role"]) {
  const value: OrganizationContextValue = {
    organization: fakeOrg({ my_role: role }),
    loading: false,
    error: null,
    onOrganizationUpdate: vi.fn(),
  };
  return render(
    <OrganizationProvider value={value}>
      <DashboardPage />
    </OrganizationProvider>
  );
}

afterEach(() => {
  cleanup();
  mockUseDashboard.mockReset();
});

describe("DashboardPage — botão de relatório em PDF (PR4)", () => {
  it("ANALYST vê o botão de baixar relatório em PDF", () => {
    mockUseDashboard.mockReturnValue(DASHBOARD_RESULT);
    renderWithRole("ANALYST");
    expect(screen.getByRole("button", { name: /Baixar relatório em PDF/ })).toBeInTheDocument();
  });

  it("ORGANIZATION_OWNER (acima de ANALYST na hierarquia) também vê o botão", () => {
    mockUseDashboard.mockReturnValue(DASHBOARD_RESULT);
    renderWithRole("ORGANIZATION_OWNER");
    expect(screen.getByRole("button", { name: /Baixar relatório em PDF/ })).toBeInTheDocument();
  });

  it("VIEWER não vê o botão — o endpoint /reports/basic/pdf exige ANALYST+ e sempre retornaria 403", () => {
    mockUseDashboard.mockReturnValue(DASHBOARD_RESULT);
    renderWithRole("VIEWER");
    expect(screen.queryByRole("button", { name: /Baixar relatório em PDF/ })).not.toBeInTheDocument();
  });
});
