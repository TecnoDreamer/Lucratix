import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { ExportPanel } from "./export-panel";

const mockDownloadFile = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, downloadFile: (...args: unknown[]) => mockDownloadFile(...args) };
});

// jsdom não implementa createObjectURL/revokeObjectURL nem navegação real de
// <a download> — o componente só precisa deles para disparar o download do
// browser, o que não é o que este teste verifica (isso é comportamento do
// browser, não lógica da aplicação).
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  mockDownloadFile.mockReset();
});

function fakeBlobResult(filename = "financial_periods_export.csv") {
  return { blob: new Blob(["a,b"]), filename };
}

describe("ExportPanel", () => {
  it("exporta em CSV por padrão, sem filtro de data", async () => {
    mockDownloadFile.mockResolvedValue(fakeBlobResult());
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1/exports/financial_periods?format=csv"
      );
    });
  });

  it("troca o formato ao clicar em outro botão", async () => {
    mockDownloadFile.mockResolvedValue(fakeBlobResult("financial_periods_export.json"));
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1/exports/financial_periods?format=json"
      );
    });
  });

  it("inclui date_from/date_to quando o filtro de período está marcado", async () => {
    mockDownloadFile.mockResolvedValue(fakeBlobResult());
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByLabelText("Filtrar por período (padrão: todos os períodos)"));
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1/exports/financial_periods?format=csv&date_from=2026-01-01&date_to=2026-12-31"
      );
    });
  });

  it("bloqueia quando a data inicial é depois da data final", async () => {
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByLabelText("Filtrar por período (padrão: todos os períodos)"));
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    expect(
      await screen.findByText("A data inicial não pode ser depois da data final.")
    ).toBeInTheDocument();
    expect(mockDownloadFile).not.toHaveBeenCalled();
  });

  it("mostra o erro da API quando a exportação falha", async () => {
    mockDownloadFile.mockRejectedValue(new ApiError(400, "Domínio não suportado."));
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    expect(await screen.findByText("Domínio não suportado.")).toBeInTheDocument();
  });

  it("troca o domínio para Funil ao clicar no botão", async () => {
    mockDownloadFile.mockResolvedValue(fakeBlobResult("funnel_snapshots_export.csv"));
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Funil" }));
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1/exports/funnel_snapshots?format=csv"
      );
    });
  });

  it("esconde o filtro de período para Produtos (catálogo, não série temporal)", () => {
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Produtos" }));

    expect(
      screen.queryByLabelText("Filtrar por período (padrão: todos os períodos)")
    ).not.toBeInTheDocument();
  });

  it("exporta Produtos sem parâmetros de data mesmo tendo marcado o filtro antes de trocar de domínio", async () => {
    mockDownloadFile.mockResolvedValue(fakeBlobResult("products_export.csv"));
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByLabelText("Filtrar por período (padrão: todos os períodos)"));
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Produtos" }));
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1/exports/products?format=csv"
      );
    });
  });

  it("troca o domínio para Marketing ao clicar no botão", async () => {
    mockDownloadFile.mockResolvedValue(fakeBlobResult("campaigns_export.csv"));
    render(<ExportPanel organizationId="org-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Marketing" }));
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1/exports/campaigns?format=csv"
      );
    });
  });

  it("sem papel suficiente (ou sem organização carregada), não mostra a opção Auditoria", () => {
    render(<ExportPanel organizationId="org-1" />);
    expect(screen.queryByRole("button", { name: "Auditoria" })).not.toBeInTheDocument();
  });

  it("VIEWER não vê a opção Auditoria — o endpoint exige ORGANIZATION_ADMIN", () => {
    render(<ExportPanel organizationId="org-1" role="VIEWER" />);
    expect(screen.queryByRole("button", { name: "Auditoria" })).not.toBeInTheDocument();
  });

  it("ORGANIZATION_ADMIN vê e consegue exportar Auditoria", async () => {
    mockDownloadFile.mockResolvedValue(fakeBlobResult("audit_logs_export.csv"));
    render(<ExportPanel organizationId="org-1" role="ORGANIZATION_ADMIN" />);

    fireEvent.click(screen.getByRole("button", { name: "Auditoria" }));
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(
        "/api/v1/organizations/org-1/exports/audit_logs?format=csv"
      );
    });
  });
});
