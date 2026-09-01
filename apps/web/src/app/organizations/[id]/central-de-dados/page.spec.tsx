import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { OrganizationProvider, type OrganizationContextValue } from "@/contexts/organization-context";
import type { Organization } from "@/lib/types";
import CentralDeDadosPage from "./page";

const mockPush = vi.fn();
const mockRouter = { push: mockPush };

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => mockRouter,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

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

function renderWithOrg(ctxOverrides: Partial<OrganizationContextValue> = {}) {
  const value: OrganizationContextValue = {
    organization: fakeOrg(),
    loading: false,
    error: null,
    onOrganizationUpdate: vi.fn(),
    ...ctxOverrides,
  };
  return render(
    <OrganizationProvider value={value}>
      <CentralDeDadosPage />
    </OrganizationProvider>
  );
}

function fakeJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `job-${Math.random()}`,
    source_filename: "financeiro.csv",
    file_format: "csv",
    status: "COMPLETED",
    total_rows: 2,
    valid_rows: 2,
    invalid_rows: 0,
    duplicate_rows: 0,
    created_rows: 2,
    updated_rows: 0,
    skipped_rows: 0,
    created_at: "2026-08-29T10:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
});

describe("CentralDeDadosPage", () => {
  it("sempre mostra a seção de exportação, mesmo enquanto a empresa carrega", () => {
    renderWithOrg({ organization: null, loading: true });
    expect(screen.getByText("Exportar dados")).toBeInTheDocument();
  });

  it("não mostra o wizard de importação nem o aviso de permissão enquanto o papel ainda não é conhecido", () => {
    renderWithOrg({ organization: null, loading: true });
    expect(screen.queryByText("Importar dados")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Apenas Analista ou superior pode importar dados. Você ainda pode exportar os dados acima.")
    ).not.toBeInTheDocument();
  });

  it("VIEWER só vê o aviso de permissão, sem o wizard de importação nem chamada ao histórico", async () => {
    vi.mocked(api.get).mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    renderWithOrg({ organization: fakeOrg({ my_role: "VIEWER" }) });

    expect(
      await screen.findByText(
        "Apenas Analista ou superior pode importar dados. Você ainda pode exportar os dados acima."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Importar dados")).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("ANALYST+ vê o wizard de importação e o histórico carregado", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [fakeJob({ source_filename: "janeiro.csv" })],
      total: 1,
      limit: 20,
      offset: 0,
    });

    renderWithOrg();

    expect(screen.getByText("Importar dados")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("janeiro.csv")).toBeInTheDocument();
    });
  });

  it("mostra o estado vazio quando não há importações no histórico", async () => {
    vi.mocked(api.get).mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    renderWithOrg();

    expect(await screen.findByText("Nenhuma importação realizada ainda.")).toBeInTheDocument();
  });

  it("'Carregar mais' soma a próxima página ao histórico", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("offset=0")) {
        return Promise.resolve({
          items: [fakeJob({ id: "job-1", source_filename: "primeiro.csv" })],
          total: 2,
          limit: 1,
          offset: 0,
        });
      }
      return Promise.resolve({
        items: [fakeJob({ id: "job-2", source_filename: "segundo.csv" })],
        total: 2,
        limit: 1,
        offset: 1,
      });
    });

    renderWithOrg();

    await waitFor(() => {
      expect(screen.getByText("primeiro.csv")).toBeInTheDocument();
    });
    expect(screen.getByText("Mostrando 1 de 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));

    await waitFor(() => {
      expect(screen.getByText("segundo.csv")).toBeInTheDocument();
    });
    expect(screen.getByText("primeiro.csv")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 2 de 2")).toBeInTheDocument();
  });

  it("mostra 'Ver erros' para um job com linhas inválidas e lista os erros ao clicar", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("/errors")) {
        return Promise.resolve({ items: [{ row_number: 5, field: "revenue", message: "Valor inválido." }] });
      }
      return Promise.resolve({
        items: [fakeJob({ id: "job-1", source_filename: "comerro.csv", invalid_rows: 1, status: "COMPLETED_WITH_ERRORS" })],
        total: 1,
        limit: 20,
        offset: 0,
      });
    });

    renderWithOrg();

    await waitFor(() => {
      expect(screen.getByText("comerro.csv")).toBeInTheDocument();
    });
    // Conteúdo do acordeão abre ao clicar no cabeçalho (AccordionItem).
    fireEvent.click(screen.getByRole("button", { name: /comerro\.csv/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ver erros" }));

    expect(await screen.findByText(/Valor inválido\./)).toBeInTheDocument();
  });
});
