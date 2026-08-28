import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import AuditPage from "./page";

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

function fakeLog(overrides: Partial<{ id: string; action: string; entity: string }> = {}) {
  return {
    id: overrides.id ?? `log-${Math.random()}`,
    organization_id: "org-123",
    user_id: "user-1",
    action: overrides.action ?? "organization.created",
    entity: overrides.entity ?? "organization",
    entity_id: "org-123",
    created_at: "2026-08-27T10:00:00Z",
  };
}

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
});

describe("AuditPage", () => {
  it("mostra a tabela com os eventos carregados", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [fakeLog({ action: "organization.created" })],
      total: 1,
      limit: 50,
      offset: 0,
    });

    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText("organization.created")).toBeInTheDocument();
    });
    expect(screen.getByText("organization")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando não há eventos", async () => {
    vi.mocked(api.get).mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText("Nenhum evento registrado ainda.")).toBeInTheDocument();
    });
  });

  it("mostra mensagem específica quando o papel é insuficiente (403)", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(403, "Papel insuficiente"));

    render(<AuditPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Apenas administradores da organização podem consultar a auditoria.")
      ).toBeInTheDocument();
    });
  });

  it("'Carregar mais' busca a próxima página e soma ao total mostrado", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("offset=0")) {
        return Promise.resolve({
          items: [fakeLog({ id: "log-1", action: "organization.created" })],
          total: 2,
          limit: 1,
          offset: 0,
        });
      }
      return Promise.resolve({
        items: [fakeLog({ id: "log-2", action: "organization.updated" })],
        total: 2,
        limit: 1,
        offset: 1,
      });
    });

    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText("organization.created")).toBeInTheDocument();
    });
    expect(screen.getByText("Mostrando 1 de 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));

    await waitFor(() => {
      expect(screen.getByText("organization.updated")).toBeInTheDocument();
    });
    // Os dois eventos ficam visíveis (a nova página é somada, não substitui).
    expect(screen.getByText("organization.created")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 2 de 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });
});
