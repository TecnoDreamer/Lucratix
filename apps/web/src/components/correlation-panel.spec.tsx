import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { ExecutiveCorrelation } from "@/lib/metrics";
import { CorrelationPanel } from "./correlation-panel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
});

function fakeCorrelation(overrides: Partial<ExecutiveCorrelation> = {}): ExecutiveCorrelation {
  return {
    date_from: "2026-06-01",
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
    ...overrides,
  };
}

describe("CorrelationPanel", () => {
  it("mostra o coeficiente e a interpretação quando aplicável", async () => {
    vi.mocked(api.get).mockResolvedValue(fakeCorrelation());
    render(<CorrelationPanel organizationId="org-123" dateFrom="2026-06-01" dateTo="2026-08-31" />);

    await waitFor(() => {
      expect(screen.getByText(/Correlação forte positiva/)).toBeInTheDocument();
    });
    expect(screen.getByText(/3 meses com as duas métricas/)).toBeInTheDocument();
  });

  it("mostra o motivo (não um coeficiente) quando não aplicável", async () => {
    vi.mocked(api.get).mockResolvedValue(
      fakeCorrelation({
        correlation: { value: null, is_applicable: false, reason: "poucos meses com as duas métricas aplicáveis (mínimo 3)" },
        months_used: 1,
      })
    );
    render(<CorrelationPanel organizationId="org-123" dateFrom="2026-06-01" dateTo="2026-08-31" />);

    await waitFor(() => {
      expect(screen.getByText(/poucos meses/)).toBeInTheDocument();
    });
    // O título fixo da seção ("Correlação entre métricas") continua lá — o
    // que não deve aparecer é o rótulo de interpretação do coeficiente.
    expect(screen.queryByText(/^Correlação (forte|moderada|fraca)/)).not.toBeInTheDocument();
  });

  it("trocar a métrica X refaz a busca com o novo par", async () => {
    vi.mocked(api.get).mockResolvedValue(fakeCorrelation());
    render(<CorrelationPanel organizationId="org-123" dateFrom="2026-06-01" dateTo="2026-08-31" />);

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Métrica X"), { target: { value: "profit" } });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    const lastCall = vi.mocked(api.get).mock.calls[1][0] as string;
    expect(lastCall).toContain("metric_x=profit");
  });

  it("a métrica já selecionada em X fica desabilitada no seletor de Y", async () => {
    vi.mocked(api.get).mockResolvedValue(fakeCorrelation());
    render(<CorrelationPanel organizationId="org-123" dateFrom="2026-06-01" dateTo="2026-08-31" />);

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const ySelect = screen.getByLabelText("Métrica Y") as HTMLSelectElement;
    const revenueOption = Array.from(ySelect.options).find((o) => o.value === "revenue");
    expect(revenueOption?.disabled).toBe(true);
  });
});
