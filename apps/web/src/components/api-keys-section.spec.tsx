import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { ApiKey, ApiKeyCreated } from "@/lib/types";
import { ApiKeysSection } from "./api-keys-section";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn(), del: vi.fn() } };
});

function fakeKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: "key-1",
    organization_id: "org-1",
    created_by_user_id: "user-1",
    name: "Power BI",
    key_prefix: "lucratix_ab12",
    created_at: "2026-09-01T00:00:00Z",
    revoked_at: null,
    last_used_at: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.del).mockReset();
});

describe("ApiKeysSection", () => {
  it("mostra estado vazio quando nao ha nenhuma chave", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    render(<ApiKeysSection organizationId="org-1" />);

    expect(await screen.findByText("Nenhuma chave de API criada ainda.")).toBeInTheDocument();
  });

  it("lista chaves ativas com nome e prefixo", async () => {
    vi.mocked(api.get).mockResolvedValue([fakeKey()]);

    render(<ApiKeysSection organizationId="org-1" />);

    expect(await screen.findByText("Power BI")).toBeInTheDocument();
    expect(screen.getByText(/lucratix_ab12/)).toBeInTheDocument();
    expect(screen.getByText(/nunca usada/)).toBeInTheDocument();
  });

  it("criar uma chave mostra o valor bruto uma unica vez", async () => {
    const created: ApiKeyCreated = { ...fakeKey(), raw_key: "lucratix_segredo-de-verdade" };
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue(created);

    render(<ApiKeysSection organizationId="org-1" />);
    await screen.findByText("Nenhuma chave de API criada ainda.");

    fireEvent.change(screen.getByLabelText("Nome da chave"), { target: { value: "Power BI" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar chave" }));

    expect(await screen.findByText("lucratix_segredo-de-verdade")).toBeInTheDocument();
    expect(screen.getByText("Copie sua chave agora")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/api/v1/organizations/org-1/api-keys", { name: "Power BI" });
  });

  it("revogar exige confirmacao e chama DELETE com o id certo", async () => {
    vi.mocked(api.get).mockResolvedValue([fakeKey()]);
    vi.mocked(api.del).mockResolvedValue(undefined);

    render(<ApiKeysSection organizationId="org-1" />);
    await screen.findByText("Power BI");

    fireEvent.click(screen.getByRole("button", { name: "Revogar" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Revogar esta chave?")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Revogar" }));

    await waitFor(() => {
      expect(api.del).toHaveBeenCalledWith("/api/v1/organizations/org-1/api-keys/key-1");
    });
  });

  it("cancelar a revogacao nao chama DELETE", async () => {
    vi.mocked(api.get).mockResolvedValue([fakeKey()]);

    render(<ApiKeysSection organizationId="org-1" />);
    await screen.findByText("Power BI");

    fireEvent.click(screen.getByRole("button", { name: "Revogar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(api.del).not.toHaveBeenCalled();
  });
});
