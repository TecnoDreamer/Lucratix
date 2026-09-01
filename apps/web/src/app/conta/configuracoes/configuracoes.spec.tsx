import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { api } from "@/lib/api";
import { AccountProvider, type AccountContextValue } from "@/contexts/account-context";
import type { Organization } from "@/lib/types";
import AccountSettingsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), patch: vi.fn() } };
});

function fakeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "org-1",
    name: "Empresa Um",
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

function mockPreferences(quickAccess: { id: string; enabled: boolean }[] | null = null) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.includes("/workspace-preferences")) {
      return Promise.resolve({ organization_id: "org-1", quick_access: quickAccess, updated_at: null });
    }
    return Promise.reject(new Error(`unexpected path ${path}`));
  });
  vi.mocked(api.patch).mockResolvedValue({
    organization_id: "org-1",
    quick_access: quickAccess,
    updated_at: "2026-08-31T00:00:00Z",
  });
}

function renderWithAccount(overrides: Partial<AccountContextValue> = {}) {
  const organizations = overrides.organizations ?? [fakeOrg()];
  const value: AccountContextValue = {
    organizations,
    activeOrganization: organizations[0] ?? null,
    loading: false,
    error: null,
    ...overrides,
  };
  return render(
    <AccountProvider value={value}>
      <AccountSettingsPage />
    </AccountProvider>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.mocked(api.get).mockReset();
  vi.mocked(api.patch).mockReset();
});

describe("AccountSettingsPage", () => {
  it("mostra as tres opcoes de tema", async () => {
    mockPreferences();
    renderWithAccount();
    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
    });
    expect(screen.getByRole("radio", { name: "Sistema" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Escuro" })).toBeInTheDocument();
  });

  it("comeca com 'Sistema' marcado quando nao ha preferencia salva", async () => {
    mockPreferences();
    renderWithAccount();
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Sistema" })).toHaveAttribute("aria-checked", "true");
    });
  });

  it("reflete a preferencia ja salva ao carregar", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    mockPreferences();
    renderWithAccount();
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Escuro" })).toHaveAttribute("aria-checked", "true");
    });
  });

  it("clicar em 'Escuro' marca a opcao, persiste e aplica a classe dark", async () => {
    mockPreferences();
    renderWithAccount();
    await waitFor(() => screen.getByRole("radiogroup", { name: "Tema" }));

    fireEvent.click(screen.getByRole("radio", { name: "Escuro" }));

    expect(screen.getByRole("radio", { name: "Escuro" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Sistema" })).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("clicar em 'Claro' remove a classe dark", async () => {
    document.documentElement.classList.add("dark");
    mockPreferences();
    renderWithAccount();
    await waitFor(() => screen.getByRole("radiogroup", { name: "Tema" }));

    fireEvent.click(screen.getByRole("radio", { name: "Claro" }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  describe("Acessos rápidos", () => {
    it("lista os cards permitidos para o papel atual", async () => {
      mockPreferences();
      renderWithAccount();

      await waitFor(() => {
        expect(screen.getByLabelText("Mostrar Analytics")).toBeInTheDocument();
      });
      expect(screen.getByLabelText("Mostrar Financeiro")).toBeInTheDocument();
      expect(screen.getByLabelText("Mostrar Central de Dados")).toBeInTheDocument();
    });

    it("VIEWER não vê a linha de Analytics (exige ANALYST+)", async () => {
      mockPreferences();
      renderWithAccount({ organizations: [fakeOrg({ my_role: "VIEWER" })] });

      await waitFor(() => {
        expect(screen.getByLabelText("Mostrar Financeiro")).toBeInTheDocument();
      });
      expect(screen.queryByLabelText("Mostrar Analytics")).not.toBeInTheDocument();
    });

    it("mover 'Analytics' para baixo e salvar envia o PATCH com a nova ordem", async () => {
      mockPreferences();
      renderWithAccount();

      await waitFor(() => {
        expect(screen.getByLabelText("Mostrar Analytics")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: "Mover Analytics para baixo" }));
      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled();
      });
      const [path, body] = vi.mocked(api.patch).mock.calls[0] as [string, { quick_access: { id: string }[] }];
      expect(path).toBe("/api/v1/organizations/org-1/workspace-preferences");
      expect(body.quick_access[0].id).toBe("financials");
      expect(body.quick_access[1].id).toBe("analytics");
    });

    it("desmarcar 'Analytics' e salvar envia enabled:false", async () => {
      mockPreferences();
      renderWithAccount();

      await waitFor(() => {
        expect(screen.getByLabelText("Mostrar Analytics")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText("Mostrar Analytics"));
      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalled();
      });
      const [, body] = vi.mocked(api.patch).mock.calls[0] as [string, { quick_access: { id: string; enabled: boolean }[] }];
      const analytics = body.quick_access.find((item) => item.id === "analytics");
      expect(analytics?.enabled).toBe(false);
    });

    it("'Salvar' fica desabilitado até haver uma alteração", async () => {
      mockPreferences();
      renderWithAccount();

      await waitFor(() => {
        expect(screen.getByLabelText("Mostrar Analytics")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    });

    it("'Restaurar padrão' envia quick_access: null imediatamente", async () => {
      mockPreferences([{ id: "analytics", enabled: false }]);
      renderWithAccount();

      await waitFor(() => {
        expect(screen.getByLabelText("Mostrar Analytics")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "/api/v1/organizations/org-1/workspace-preferences",
          { quick_access: null }
        );
      });
    });

    it("sem nenhuma empresa, mostra estado vazio e não busca preferência", async () => {
      renderWithAccount({ organizations: [], activeOrganization: null });

      await waitFor(() => {
        expect(screen.getByText("Você ainda não faz parte de nenhuma empresa.")).toBeInTheDocument();
      });
      expect(api.get).not.toHaveBeenCalled();
    });
  });
});
