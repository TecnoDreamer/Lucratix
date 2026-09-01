import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { rememberActiveOrganizationId } from "@/lib/active-organization";
import type { Organization, OrganizationPage } from "@/lib/types";
import AccountLayout from "./layout";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

function fakeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Empresa A",
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

function fakeOrgPage(items: Organization[]): OrganizationPage {
  return { items, total: items.length, limit: 100, offset: 0 };
}

afterEach(() => {
  cleanup();
  mockSearchParams = new URLSearchParams();
  window.localStorage.clear();
  vi.mocked(api.get).mockReset();
});

describe("AccountLayout — resolução do 'Voltar'", () => {
  it("com ?from apontando para uma empresa da lista, volta para a Home dela", async () => {
    const orgA = fakeOrg();
    mockSearchParams = new URLSearchParams({ from: orgA.id });
    vi.mocked(api.get).mockResolvedValue(fakeOrgPage([orgA]));

    render(
      <AccountLayout>
        <div>conteúdo</div>
      </AccountLayout>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Voltar para Empresa A/ })).toHaveAttribute(
        "href",
        `/organizations/${orgA.id}`
      );
    });
  });

  it("deep link sem ?from, mas com id lembrado em localStorage presente na lista, resolve pelo storage", async () => {
    const orgA = fakeOrg();
    rememberActiveOrganizationId(orgA.id);
    vi.mocked(api.get).mockResolvedValue(fakeOrgPage([orgA]));

    render(
      <AccountLayout>
        <div>conteúdo</div>
      </AccountLayout>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Voltar para Empresa A/ })).toHaveAttribute(
        "href",
        `/organizations/${orgA.id}`
      );
    });
  });

  it("deep link sem ?from e sem nada em localStorage cai para 'Suas empresas'", async () => {
    vi.mocked(api.get).mockResolvedValue(fakeOrgPage([fakeOrg()]));

    render(
      <AccountLayout>
        <div>conteúdo</div>
      </AccountLayout>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Suas empresas" })).toHaveAttribute(
        "href",
        "/organizations"
      );
    });
  });

  it("?from apontando para uma empresa que o usuário não pertence (cross-tenant) cai para 'Suas empresas'", async () => {
    const orgA = fakeOrg();
    const foreignId = "99999999-9999-9999-9999-999999999999";
    mockSearchParams = new URLSearchParams({ from: foreignId });
    vi.mocked(api.get).mockResolvedValue(fakeOrgPage([orgA]));

    render(
      <AccountLayout>
        <div>conteúdo</div>
      </AccountLayout>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Suas empresas" })).toHaveAttribute(
        "href",
        "/organizations"
      );
    });
    // O nome da empresa estrangeira nunca aparece — nao ha vazamento de dado
    // entre organizacoes (RNF-002).
    expect(screen.queryByText(orgA.name)).not.toBeInTheDocument();
  });

  it("sessão expirada (401 ao buscar organizações) cai para 'Suas empresas', sem quebrar a página", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(401, "Sessao invalida ou expirada"));

    render(
      <AccountLayout>
        <div>conteúdo</div>
      </AccountLayout>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Suas empresas" })).toHaveAttribute(
        "href",
        "/organizations"
      );
    });
  });

  it("renderiza os filhos independentemente do estado do link de voltar", async () => {
    vi.mocked(api.get).mockResolvedValue(fakeOrgPage([fakeOrg()]));

    render(
      <AccountLayout>
        <div>conteúdo da página</div>
      </AccountLayout>
    );

    expect(screen.getByText("conteúdo da página")).toBeInTheDocument();
  });
});
