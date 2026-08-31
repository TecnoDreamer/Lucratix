import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { Target } from "@/lib/metrics";
import { TargetsPanel } from "./targets-panel";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), put: vi.fn(), del: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.put).mockReset();
  vi.mocked(api.del).mockReset();
});

function fakeTarget(overrides: Partial<Target> = {}): Target {
  return {
    id: "target-1",
    organization_id: "org-123",
    metric: "revenue",
    period: "2026-06-01",
    value: 50000,
    created_by: "user-1",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("TargetsPanel", () => {
  it("lista as metas já definidas", async () => {
    vi.mocked(api.get).mockResolvedValue([fakeTarget()]);
    render(<TargetsPanel organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText("Receita", { selector: "span" })).toBeInTheDocument();
    });
    expect(screen.getByText(/jun\/26/)).toBeInTheDocument();
  });

  it("sem meta nenhuma, mostra o empty state", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    render(<TargetsPanel organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText("Nenhuma meta definida ainda.")).toBeInTheDocument();
    });
  });

  it("cria uma meta em moeda enviando o valor cru (sem dividir por 100)", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.put).mockResolvedValue(fakeTarget());
    render(<TargetsPanel organizationId="org-123" />);

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Métrica"), { target: { value: "revenue" } });
    fireEvent.change(screen.getByLabelText("Mês"), { target: { value: "2026-06" } });
    fireEvent.change(screen.getByLabelText(/^Meta/), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/api/v1/organizations/org-123/targets", {
        metric: "revenue",
        period: "2026-06-01",
        value: 50000,
      });
    });
  });

  it("chama onSaved depois de criar uma meta com sucesso — a página usa isso pra atualizar o progresso agregado", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.put).mockResolvedValue(fakeTarget());
    const onSaved = vi.fn();
    render(<TargetsPanel organizationId="org-123" onSaved={onSaved} />);

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^Meta/), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it("não chama onSaved quando o salvamento falha", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.put).mockRejectedValue(new Error("falhou"));
    const onSaved = vi.fn();
    render(<TargetsPanel organizationId="org-123" onSaved={onSaved} />);

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^Meta/), { target: { value: "50000" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => expect(api.put).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("cria uma meta percentual dividindo por 100 antes de enviar", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.put).mockResolvedValue(fakeTarget({ metric: "margin", value: 0.4 }));
    render(<TargetsPanel organizationId="org-123" />);

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Métrica"), { target: { value: "margin" } });
    fireEvent.change(screen.getByLabelText("Mês"), { target: { value: "2026-06" } });
    fireEvent.change(screen.getByLabelText(/^Meta/), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/api/v1/organizations/org-123/targets", {
        metric: "margin",
        period: "2026-06-01",
        value: 0.4,
      });
    });
  });

  it("valor não numérico mostra erro e não chama a API", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    render(<TargetsPanel organizationId="org-123" />);

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^Meta/), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => {
      expect(screen.getByText(/valor numérico/)).toBeInTheDocument();
    });
    expect(api.put).not.toHaveBeenCalled();
  });

  it("remove uma meta ao clicar no botão de remover", async () => {
    vi.mocked(api.get).mockResolvedValue([fakeTarget()]);
    vi.mocked(api.del).mockResolvedValue(undefined);
    render(<TargetsPanel organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText("Receita", { selector: "span" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Remover meta/ }));

    await waitFor(() => {
      expect(api.del).toHaveBeenCalledWith("/api/v1/organizations/org-123/targets/target-1");
    });
    expect(screen.getByText("Nenhuma meta definida ainda.")).toBeInTheDocument();
  });

  it("chama onSaved depois de remover uma meta com sucesso", async () => {
    vi.mocked(api.get).mockResolvedValue([fakeTarget()]);
    vi.mocked(api.del).mockResolvedValue(undefined);
    const onSaved = vi.fn();
    render(<TargetsPanel organizationId="org-123" onSaved={onSaved} />);

    await waitFor(() => {
      expect(screen.getByText("Receita", { selector: "span" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Remover meta/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
