import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { GeneratePdfReportButton } from "./generate-pdf-report-button";

const mockDownloadFile = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, downloadFile: (...args: unknown[]) => mockDownloadFile(...args) };
});

// jsdom não implementa createObjectURL/revokeObjectURL nem navegação real
// de <a download> — mesma nota de export-panel.spec.tsx.
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  mockDownloadFile.mockReset();
});

describe("GeneratePdfReportButton", () => {
  it("clicar chama downloadFile com o caminho recebido e dispara o download", async () => {
    mockDownloadFile.mockResolvedValue({ blob: new Blob(["pdf"]), filename: "funil_relatorio.pdf" });
    render(<GeneratePdfReportButton path="/api/v1/organizations/org-1/reports/funnel/pdf" label="Gerar relatório PDF" />);

    fireEvent.click(screen.getByRole("button", { name: "Gerar relatório PDF" }));

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith("/api/v1/organizations/org-1/reports/funnel/pdf");
    });
  });

  it("mostra 'Gerando PDF...' enquanto a chamada esta em andamento", async () => {
    let resolvePromise: (value: { blob: Blob; filename: string }) => void = () => {};
    mockDownloadFile.mockReturnValue(new Promise((resolve) => (resolvePromise = resolve)));
    render(<GeneratePdfReportButton path="/api/v1/organizations/org-1/reports/funnel/pdf" label="Gerar relatório PDF" />);

    fireEvent.click(screen.getByRole("button", { name: "Gerar relatório PDF" }));
    expect(await screen.findByRole("button", { name: "Gerando PDF..." })).toBeDisabled();

    resolvePromise({ blob: new Blob(["pdf"]), filename: "funil_relatorio.pdf" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Gerar relatório PDF" })).not.toBeDisabled();
    });
  });

  it("erro do backend mostra a mensagem exata devolvida", async () => {
    mockDownloadFile.mockRejectedValue(new ApiError(403, "Acesso negado"));
    render(<GeneratePdfReportButton path="/api/v1/organizations/org-1/reports/funnel/pdf" label="Gerar relatório PDF" />);

    fireEvent.click(screen.getByRole("button", { name: "Gerar relatório PDF" }));

    expect(await screen.findByText("Acesso negado")).toBeInTheDocument();
  });

  it("erro generico (nao ApiError) mostra a mensagem padrao traduzida", async () => {
    mockDownloadFile.mockRejectedValue(new Error("network down"));
    render(<GeneratePdfReportButton path="/api/v1/organizations/org-1/reports/funnel/pdf" label="Gerar relatório PDF" />);

    fireEvent.click(screen.getByRole("button", { name: "Gerar relatório PDF" }));

    expect(await screen.findByText("Não foi possível gerar o relatório em PDF.")).toBeInTheDocument();
  });
});
