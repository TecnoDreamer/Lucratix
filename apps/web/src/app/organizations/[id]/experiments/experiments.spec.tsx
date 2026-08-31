import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import type { Experiment, ExperimentResult } from "@/lib/business";
import ExperimentsPage from "./page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.patch).mockReset();
});

const EXPERIMENT: Experiment = {
  id: "exp-1",
  organization_id: "org-123",
  hypothesis: "Botão verde converte mais",
  page_or_process: "Checkout",
  primary_metric: "conversion_rate",
  start_date: null,
  end_date: null,
  status: "running",
  variants: [
    { id: "v-control", name: "Controle", sample_size: 30, conversions: 20 },
    { id: "v-test", name: "Variante", sample_size: 30, conversions: 10 },
  ],
};

function fakeResult(isSignificant: boolean | null): ExperimentResult {
  return {
    variants: [
      {
        name: "Controle",
        sample_size: 30,
        conversions: 20,
        conversion_rate: { value: 0.6667, is_applicable: true, reason: null },
        p_value: null,
        is_significant: null,
      },
      {
        name: "Variante",
        sample_size: 30,
        conversions: 10,
        conversion_rate: { value: 0.3333, is_applicable: true, reason: null },
        p_value: isSignificant === null ? null : isSignificant ? 0.009823 : 0.605577,
        is_significant: isSignificant,
      },
    ],
    has_sufficient_sample: isSignificant !== null,
    leading_variant_name: isSignificant === null ? null : "Controle",
    note: isSignificant === null ? "Amostra minima nao atingida (RN-013)." : "Teste-z de duas proporcoes...",
    significance_alpha: 0.05,
  };
}

describe("ExperimentsPage", () => {
  it("mostra estado vazio quando não há experimentos", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    render(<ExperimentsPage />);

    expect(await screen.findByText("Nenhum experimento criado ainda.")).toBeInTheDocument();
  });

  it("atualizar uma variante busca o resultado e mostra o badge de significância (significativo)", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([EXPERIMENT]);
    vi.mocked(api.patch).mockResolvedValue(undefined);
    vi.mocked(api.get).mockResolvedValueOnce(fakeResult(true));

    render(<ExperimentsPage />);
    await screen.findByText("Botão verde converte mais");

    const amostraInputs = screen.getAllByPlaceholderText("Amostra");
    const conversoesInputs = screen.getAllByPlaceholderText("Conversões");
    fireEvent.change(amostraInputs[1], { target: { value: "30" } });
    fireEvent.change(conversoesInputs[1], { target: { value: "10" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" })[1]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/api/v1/organizations/org-123/experiments/exp-1/variants/v-test",
        { sample_size: 30, conversions: 10 }
      );
    });

    expect(await screen.findByText(/significativo \(p=0\.010\)/)).toBeInTheDocument();
    // A Controle nunca compara contra si mesma — sem badge de p-valor nela.
    const controlCard = screen.getByText("Controle").closest("div") as HTMLElement;
    expect(controlCard.textContent).not.toMatch(/p=/);
  });

  it("badge mostra 'não significativo' quando o p-valor está acima do limiar", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([EXPERIMENT]);
    vi.mocked(api.patch).mockResolvedValue(undefined);
    vi.mocked(api.get).mockResolvedValueOnce(fakeResult(false));

    render(<ExperimentsPage />);
    await screen.findByText("Botão verde converte mais");
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" })[1]);

    expect(await screen.findByText(/não significativo \(p=0\.606\)/)).toBeInTheDocument();
  });

  it("sem amostra suficiente, nenhum badge de significância aparece", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([EXPERIMENT]);
    vi.mocked(api.patch).mockResolvedValue(undefined);
    vi.mocked(api.get).mockResolvedValueOnce(fakeResult(null));

    render(<ExperimentsPage />);
    await screen.findByText("Botão verde converte mais");
    fireEvent.click(screen.getAllByRole("button", { name: "Salvar" })[1]);

    await screen.findByText("Nenhuma variante em vantagem indicada.");
    expect(screen.queryByText(/p=/)).not.toBeInTheDocument();
  });

  it("cria experimento com Controle + Variante", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue(EXPERIMENT);

    render(<ExperimentsPage />);
    await screen.findByText("Nenhum experimento criado ainda.");

    fireEvent.change(screen.getByLabelText("Hipótese"), { target: { value: "Botão verde converte mais" } });
    fireEvent.change(screen.getByLabelText("Página/processo"), { target: { value: "Checkout" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar experimento (Controle + Variante)" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/organizations/org-123/experiments", {
        hypothesis: "Botão verde converte mais",
        page_or_process: "Checkout",
        primary_metric: "conversion_rate",
        variants: [{ name: "Controle" }, { name: "Variante" }],
      });
    });
    expect(await screen.findByText("Botão verde converte mais")).toBeInTheDocument();
  });

  it("erro 401 redireciona para login", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(401, "Não autenticado"));

    render(<ExperimentsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
