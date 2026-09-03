import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import type { FinancialPeriod } from "@/lib/business";
import FinancialsPage from "./page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), put: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.put).mockReset();
  mockPush.mockReset();
});

const PERIOD: FinancialPeriod = {
  id: "fp-1",
  organization_id: "org-123",
  period: "2026-06-01",
  revenue: 100000,
  costs: 40000,
  expenses: 18100,
  marketing_investment: 5000,
  taxes: null,
  profit: 41900,
  margin: 0.419,
};

describe("FinancialsPage", () => {
  it("mostra estado vazio quando não há períodos", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    render(<FinancialsPage />);

    expect(
      await screen.findByText("Nenhum período financeiro registrado ainda.")
    ).toBeInTheDocument();
  });

  it("formata a margem em pt-BR (vírgula decimal), não com ponto", async () => {
    vi.mocked(api.get).mockResolvedValue([PERIOD]);

    render(<FinancialsPage />);

    // Aparece na tabela e (de novo, sr-only) na tabela alternativa do
    // gráfico de evolução de margem (PR4) — mesmo dado, duas representações.
    const matches = await screen.findAllByText("41,9%");
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.queryByText("41.9%")).not.toBeInTheDocument();
  });

  it("mostra 'não aplicável' quando a margem é nula", async () => {
    vi.mocked(api.get).mockResolvedValue([{ ...PERIOD, profit: null, margin: null }]);

    render(<FinancialsPage />);

    await screen.findByText("2026-06-01");
    expect(screen.getAllByText("não aplicável").length).toBeGreaterThan(0);
  });

  it("mostra o gráfico de evolução de receita/lucro/margem (PR4)", async () => {
    vi.mocked(api.get).mockResolvedValue([PERIOD]);

    render(<FinancialsPage />);

    await screen.findByText("2026-06-01");
    expect(screen.getByRole("img", { name: "Receita — evolução mensal" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Lucro — evolução mensal" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Margem — evolução mensal" })).toBeInTheDocument();
  });

  it("não mostra o gráfico de evolução sem nenhum período", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    render(<FinancialsPage />);

    await screen.findByText("Nenhum período financeiro registrado ainda.");
    expect(screen.queryByRole("img", { name: "Receita — evolução mensal" })).not.toBeInTheDocument();
  });

  it("erro 401 redireciona para login", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(401, "Não autenticado"));

    render(<FinancialsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
