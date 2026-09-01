import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { OrganizationProvider, type OrganizationContextValue } from "@/contexts/organization-context";
import type { Organization } from "@/lib/types";
import OrganizationSettingsPage from "./page";

const mockPush = vi.fn();
const mockRouter = { push: mockPush };

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => mockRouter,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, patch: vi.fn(), post: vi.fn(), postForm: vi.fn(), del: vi.fn() } };
});

function fakeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "org-123",
    name: "Empresa Teste",
    trade_name: null,
    segment: null,
    cnpj: null,
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    tracking_start_date: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    status: "active",
    closed_at: null,
    closure_reason: null,
    logo_url: null,
    my_role: "ORGANIZATION_OWNER",
    ...overrides,
  };
}

function renderWithOrg(ctxOverrides: Partial<OrganizationContextValue> = {}) {
  const onOrganizationUpdate = vi.fn();
  const value: OrganizationContextValue = {
    organization: fakeOrg(),
    loading: false,
    error: null,
    onOrganizationUpdate,
    ...ctxOverrides,
  };
  const result = render(
    <OrganizationProvider value={value}>
      <OrganizationSettingsPage />
    </OrganizationProvider>
  );
  return { ...result, onOrganizationUpdate };
}

afterEach(() => {
  cleanup();
  vi.mocked(api.patch).mockReset();
  vi.mocked(api.post).mockReset();
});

describe("OrganizationSettingsPage", () => {
  it("bloqueia quem não é ORGANIZATION_ADMIN+", () => {
    renderWithOrg({ organization: fakeOrg({ my_role: "ANALYST" }) });
    expect(screen.getByText("Você não tem permissão para editar esta empresa.")).toBeInTheDocument();
    expect(screen.queryByText("Ciclo de vida")).not.toBeInTheDocument();
  });

  it("salva os dados cadastrais via PATCH e propaga a resposta pro contexto", async () => {
    const updated = fakeOrg({ name: "Novo Nome" });
    vi.mocked(api.patch).mockResolvedValue(updated);
    const { onOrganizationUpdate } = renderWithOrg();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Novo Nome" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));

    await waitFor(() => {
      expect(onOrganizationUpdate).toHaveBeenCalledWith(updated);
    });
    expect(api.patch).toHaveBeenCalledWith(
      "/api/v1/organizations/org-123",
      expect.objectContaining({ name: "Novo Nome" })
    );
    expect(await screen.findByText("Dados salvos.")).toBeInTheDocument();
  });

  it("encerrar empresa exige confirmação e propaga o novo status pro contexto", async () => {
    const frozen = fakeOrg({ status: "frozen", closed_at: "2026-09-01T00:00:00Z" });
    vi.mocked(api.post).mockResolvedValue(frozen);
    const { onOrganizationUpdate } = renderWithOrg();

    fireEvent.click(screen.getByRole("button", { name: "Encerrar empresa" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Encerrar" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/organizations/org-123/freeze", { reason: undefined });
    });
    expect(onOrganizationUpdate).toHaveBeenCalledWith(frozen);
  });

  it("reativa a empresa sem diálogo de confirmação", async () => {
    const reactivated = fakeOrg({ status: "active" });
    vi.mocked(api.post).mockResolvedValue(reactivated);
    const { onOrganizationUpdate } = renderWithOrg({
      organization: fakeOrg({ status: "frozen", closed_at: "2026-09-01T00:00:00Z" }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Reativar empresa" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/organizations/org-123/reactivate");
    });
    expect(onOrganizationUpdate).toHaveBeenCalledWith(reactivated);
  });

  it("erro ao encerrar mantém o diálogo aberto com a mensagem", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.mocked(api.post).mockRejectedValue(new ApiError(409, "Esta empresa já está encerrada."));
    renderWithOrg();

    fireEvent.click(screen.getByRole("button", { name: "Encerrar empresa" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Encerrar" }));

    expect(await within(dialog).findByText("Esta empresa já está encerrada.")).toBeInTheDocument();
  });
});
