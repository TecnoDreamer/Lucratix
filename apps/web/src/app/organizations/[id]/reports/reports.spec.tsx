import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import ReportPage from "./page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

const applicable = (value: number) => ({ value, is_applicable: true, reason: null });

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  mockPush.mockReset();
});

function mockApiGet() {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.includes("/reports/basic")) {
      return Promise.resolve({
        organization: { id: "org-123", name: "Empresa Teste" },
        period: "2026-06-01",
        generated_at: "2026-06-30T12:00:00Z",
        dashboard: {
          revenue: applicable(10000),
          profit: applicable(4000),
          margin: applicable(0.4),
          cac: applicable(50),
          conversion_rate: applicable(0.1),
          average_ticket: applicable(200),
        },
        revenue_vs_baseline: null,
        profit_vs_baseline: null,
      });
    }
    if (path.includes("/analytics/marketing")) {
      return Promise.resolve({
        date_from: "2026-06-01",
        date_to: "2026-06-30",
        campaign_count: 0,
      });
    }
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

describe("ReportPage — botão de relatório em PDF (PR4)", () => {
  it("mostra o botão de baixar PDF ao lado do botão de imprimir/salvar", async () => {
    mockApiGet();
    render(<ReportPage />);

    expect(await screen.findByRole("button", { name: /Baixar relatório em PDF/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Imprimir|Salvar PDF/ })).toBeInTheDocument();
  });
});
