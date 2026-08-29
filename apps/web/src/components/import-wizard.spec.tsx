import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { ImportWizard } from "./import-wizard";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), postForm: vi.fn() },
  };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.del).mockReset();
  vi.mocked(api.postForm).mockReset();
});

const UPLOAD_RESPONSE = {
  job: { id: "job-1", source_filename: "financeiro.csv", status: "MAPPING_REQUIRED", total_rows: 2 },
  suggested_mapping: [
    { header: "Periodo", canonical_field: "period", confidence: "alta", display_name: "Período" },
    { header: "Receita", canonical_field: "revenue", confidence: "alta", display_name: "Receita" },
    { header: "Coluna X", canonical_field: null, confidence: "sem_correspondencia", display_name: null },
  ],
  domain_fields: [
    { canonical_name: "period", display_name: "Período", data_type: "date", required: true },
    { canonical_name: "revenue", display_name: "Receita", data_type: "decimal", required: false },
  ],
};

const READY_SUMMARY = { status: "READY", total: 2, valid: 2, invalid: 0, duplicate: 0 };
const NOT_READY_SUMMARY = { status: "MAPPING_REQUIRED", total: 2, valid: 0, invalid: 2, duplicate: 0 };

const PREVIEW_PAGE = {
  items: [
    { row_number: 1, transformed: { period: "2026-01-01", revenue: 1000 }, status: "valid", errors: [] },
    { row_number: 2, transformed: { period: "2026-02-01", revenue: 2000 }, status: "valid", errors: [] },
  ],
  total: 2,
  limit: 50,
  offset: 0,
};

const CONFIRM_RESPONSE = {
  status: "COMPLETED",
  total_rows: 2,
  created_rows: 2,
  updated_rows: 0,
  skipped_rows: 0,
  invalid_rows: 0,
};

function csvFile(name = "financeiro.csv") {
  return new File(["Periodo,Receita\n2026-01-01,1000\n2026-02-01,2000\n"], name, { type: "text/csv" });
}

async function uploadFile() {
  render(<ImportWizard organizationId="org-1" />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [csvFile()] } });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await waitFor(() => {
    expect(screen.getByText("financeiro.csv")).toBeInTheDocument();
  });
}

describe("ImportWizard", () => {
  it("etapa de upload: botão Continuar fica desabilitado sem arquivo escolhido", () => {
    render(<ImportWizard organizationId="org-1" />);
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("envia o arquivo e avança para o mapeamento com a sugestão pré-preenchida", async () => {
    vi.mocked(api.postForm).mockResolvedValue(UPLOAD_RESPONSE);

    await uploadFile();

    expect(api.postForm).toHaveBeenCalledWith("/api/v1/organizations/org-1/imports", expect.any(FormData));

    // Um <select> por cabeçalho, na mesma ordem de UPLOAD_RESPONSE.suggested_mapping
    // (Periodo, Receita, Coluna X), seguido do select de formato de data.
    const [periodSelect, revenueSelect] = screen.getAllByRole("combobox");
    expect(periodSelect).toHaveValue("period");
    expect(revenueSelect).toHaveValue("revenue");
    expect(screen.getAllByText("confiança alta")).toHaveLength(2);
  });

  it("mostra o erro da API quando o upload falha e permanece na etapa de upload", async () => {
    vi.mocked(api.postForm).mockRejectedValue(new ApiError(400, "Arquivo maior que o limite de 5 MB."));

    render(<ImportWizard organizationId="org-1" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [csvFile()] } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Arquivo maior que o limite de 5 MB.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
  });

  it("fluxo completo: mapeamento -> preview -> confirmação, e chama onImportCompleted", async () => {
    vi.mocked(api.postForm).mockResolvedValue(UPLOAD_RESPONSE);
    vi.mocked(api.put).mockResolvedValue(READY_SUMMARY);
    vi.mocked(api.get).mockResolvedValue(PREVIEW_PAGE);
    vi.mocked(api.post).mockResolvedValue(CONFIRM_RESPONSE);
    const onImportCompleted = vi.fn();

    render(<ImportWizard organizationId="org-1" onImportCompleted={onImportCompleted} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [csvFile()] } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("financeiro.csv");

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/api/v1/organizations/org-1/imports/job-1/mapping", {
        mapping: { Periodo: "period", Receita: "revenue" },
        transform_config: { date_format: "DMY" },
      });
    });
    expect(await screen.findByText("2 válida(s)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar importação" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/organizations/org-1/imports/job-1/confirm", {
        duplicate_strategy: "skip",
      });
    });
    expect(
      await screen.findByText("Importação concluída: 2 criado(s), 0 atualizado(s), 0 ignorado(s).")
    ).toBeInTheDocument();
    expect(onImportCompleted).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Nova importação" }));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("mapeamento incompleto (campo obrigatório faltando) mostra erro e não avança para preview", async () => {
    vi.mocked(api.postForm).mockResolvedValue(UPLOAD_RESPONSE);
    vi.mocked(api.put).mockResolvedValue(NOT_READY_SUMMARY);

    await uploadFile();
    // Desmapeia o campo obrigatório (Período), que a sugestão automática já
    // tinha preenchido, para forçar exatamente esse cenário.
    const periodRow = screen.getByText("Periodo").closest("div") as HTMLElement;
    fireEvent.change(within(periodRow).getByRole("combobox"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Campo obrigatório não mapeado: Período.")).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
    // continua na etapa de mapeamento (o botão de confirmação da etapa
    // seguinte não existe).
    expect(screen.queryByRole("button", { name: "Confirmar importação" })).not.toBeInTheDocument();
  });

  it("cancelar chama DELETE e volta para a etapa de upload", async () => {
    vi.mocked(api.postForm).mockResolvedValue(UPLOAD_RESPONSE);
    vi.mocked(api.del).mockResolvedValue(undefined);

    await uploadFile();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(api.del).toHaveBeenCalledWith("/api/v1/organizations/org-1/imports/job-1");
    });
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("mostra 'Ver erros' quando a confirmação tem linhas inválidas, e lista os erros ao clicar", async () => {
    vi.mocked(api.postForm).mockResolvedValue(UPLOAD_RESPONSE);
    vi.mocked(api.put).mockResolvedValue(READY_SUMMARY);
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("/preview")) return Promise.resolve(PREVIEW_PAGE);
      return Promise.resolve({ items: [{ row_number: 3, field: "revenue", message: "Valor inválido." }] });
    });
    vi.mocked(api.post).mockResolvedValue({ ...CONFIRM_RESPONSE, invalid_rows: 1, created_rows: 1 });

    await uploadFile();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText("2 válida(s)");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar importação" }));
    await screen.findByText(/1 inválido\(s\)/);

    fireEvent.click(screen.getByRole("button", { name: "Ver erros" }));

    const errorMessage = await screen.findByText("Valor inválido.");
    expect(within(errorMessage.closest("tr") as HTMLElement).getByText("3")).toBeInTheDocument();
  });
});
