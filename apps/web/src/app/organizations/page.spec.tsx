import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { Organization, User } from "@/lib/types";
import OrganizationsPage from "./page";

const mockPush = vi.fn();
// Objeto estável entre renders — o `useRouter()` real do Next.js memoiza a
// instância; um mock que devolvesse um objeto novo a cada chamada mudaria a
// identidade de `router` (e, em cascata, do `useCallback`/`useEffect` que
// dependem dele) a cada render, disparando `load()` de novo indefinidamente.
const mockRouter = { push: mockPush };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

const FAKE_USER: User = {
  id: "user-1",
  name: "Usuária Teste",
  email: "teste@example.com",
  is_platform_admin: false,
};

function fakeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: `org-${Math.random()}`,
    name: "Empresa Padrão",
    trade_name: null,
    segment: null,
    cnpj: null,
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    tracking_start_date: null,
    notes: null,
    created_at: "2026-01-15T10:00:00Z",
    my_role: "ORGANIZATION_OWNER",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  mockPush.mockReset();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});

describe("OrganizationsPage", () => {
  it("mostra as empresas em cards depois de carregar", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("/auth/me")) return Promise.resolve(FAKE_USER);
      return Promise.resolve([fakeOrg({ name: "Empresa A" }), fakeOrg({ name: "Empresa B" })]);
    });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Empresa A")).toBeInTheDocument();
    });
    expect(screen.getByText("Empresa B")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando não há empresas", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("/auth/me")) return Promise.resolve(FAKE_USER);
      return Promise.resolve([]);
    });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Nenhuma empresa ainda. Cadastre a primeira abaixo.")).toBeInTheDocument();
    });
  });

  it("não mostra busca com poucas empresas, mas mostra e filtra com mais de 6", async () => {
    const manyOrgs = Array.from({ length: 7 }, (_, i) => fakeOrg({ name: `Empresa ${i + 1}` }));
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("/auth/me")) return Promise.resolve(FAKE_USER);
      return Promise.resolve(manyOrgs);
    });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Empresa 1")).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText("Buscar empresa...");
    expect(search).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "Empresa 3" } });
    expect(screen.getByText("Empresa 3")).toBeInTheDocument();
    expect(screen.queryByText("Empresa 1")).not.toBeInTheDocument();
  });

  it("permite criar uma nova empresa pelo formulário", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("/auth/me")) return Promise.resolve(FAKE_USER);
      return Promise.resolve([]);
    });
    vi.mocked(api.post).mockResolvedValue(fakeOrg({ name: "Nova Empresa Criada" }));

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Nenhuma empresa ainda. Cadastre a primeira abaixo.")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Nova empresa"), {
      target: { value: "Nova Empresa Criada" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Criar" }).closest("form")!);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/organizations", { name: "Nova Empresa Criada" });
    });
    await waitFor(() => {
      expect(screen.getByText("Nova Empresa Criada")).toBeInTheDocument();
    });
  });
});
