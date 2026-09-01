import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { Organization, OrganizationPage, User } from "@/lib/types";
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
  email_verified: true,
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
    status: "active",
    closed_at: null,
    closure_reason: null,
    logo_url: null,
    my_role: "ORGANIZATION_OWNER",
    ...overrides,
  };
}

function page(items: Organization[], overrides: Partial<OrganizationPage> = {}): OrganizationPage {
  return { items, total: items.length, limit: 24, offset: 0, ...overrides };
}

/** Monta um mock de `api.get` cobrindo os 3 endpoints que a página chama:
 * /auth/me, /organizations (lista paginada) e /organizations/summary. */
function mockApi({
  user = FAKE_USER,
  organizations = [] as Organization[],
  summary = [] as unknown[],
  organizationsByUrl,
}: {
  user?: User;
  organizations?: Organization[];
  summary?: unknown[];
  organizationsByUrl?: (url: string) => Organization[] | null;
}) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.includes("/auth/me")) return Promise.resolve(user);
    if (path.includes("/organizations/summary")) return Promise.resolve(summary);
    if (path.includes("/api/v1/organizations")) {
      const override = organizationsByUrl?.(path);
      return Promise.resolve(page(override ?? organizations));
    }
    return Promise.reject(new Error(`unexpected path ${path}`));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mockPush.mockReset();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});

describe("OrganizationsPage", () => {
  it("mostra as empresas em cards depois de carregar", async () => {
    mockApi({ organizations: [fakeOrg({ name: "Empresa A" }), fakeOrg({ name: "Empresa B" })] });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Empresa A")).toBeInTheDocument();
    });
    expect(screen.getByText("Empresa B")).toBeInTheDocument();
  });

  it("não mostra o link do Painel Admin para quem não é Super Admin", async () => {
    mockApi({ user: FAKE_USER });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText(FAKE_USER.name)).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /Painel Admin/ })).not.toBeInTheDocument();
  });

  it("mostra o link do Painel Admin para quem é Super Admin", async () => {
    mockApi({ user: { ...FAKE_USER, is_platform_admin: true } });

    render(<OrganizationsPage />);

    const link = await screen.findByRole("link", { name: /Painel Admin/ });
    expect(link).toHaveAttribute("href", "/admin");
  });

  it("não mostra aviso de e-mail quando já verificado", async () => {
    mockApi({ user: FAKE_USER });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText(FAKE_USER.name)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Confirme seu e-mail/)).not.toBeInTheDocument();
  });

  it("mostra aviso não bloqueante de e-mail não verificado, com botão de reenviar", async () => {
    mockApi({ user: { ...FAKE_USER, email_verified: false } });
    vi.mocked(api.post).mockResolvedValue({
      message: "Se o e-mail informado estiver cadastrado e ainda não verificado...",
    });

    render(<OrganizationsPage />);

    expect(await screen.findByText(/Confirme seu e-mail/)).toBeInTheDocument();
    // A empresa continua acessível normalmente — aviso nunca bloqueia nada.
    expect(screen.getByRole("button", { name: "Criar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/auth/resend-verification", {
        email: FAKE_USER.email,
      });
    });
    expect(
      await screen.findByText(/Se o e-mail informado estiver cadastrado e ainda não verificado/)
    ).toBeInTheDocument();
  });

  it("mostra o link de confirmar em modo dev quando resend-verification devolve dev_token", async () => {
    mockApi({ user: { ...FAKE_USER, email_verified: false } });
    vi.mocked(api.post).mockResolvedValue({
      message: "Se o e-mail informado estiver cadastrado e ainda não verificado...",
      dev_token: "token-reenvio",
    });

    render(<OrganizationsPage />);
    await screen.findByText(/Confirme seu e-mail/);
    fireEvent.click(screen.getByRole("button", { name: "Reenviar e-mail de confirmação" }));

    const link = await screen.findByRole("link", { name: /Confirmar agora/ });
    expect(link).toHaveAttribute("href", "/confirmar-email?token=token-reenvio");
  });

  it("mostra o estado vazio quando não há empresas", async () => {
    mockApi({});

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Nenhuma empresa ainda. Cadastre a primeira abaixo.")).toBeInTheDocument();
    });
  });

  it("não mostra busca com poucas empresas, mas mostra e filtra (server-side, com debounce) com mais de 6", async () => {
    const manyOrgs = Array.from({ length: 7 }, (_, i) => fakeOrg({ name: `Empresa ${i + 1}` }));
    mockApi({
      organizations: manyOrgs,
      organizationsByUrl: (url) => {
        if (url.includes("search=Empresa+3") || url.includes("search=Empresa%203")) {
          return manyOrgs.filter((o) => o.name === "Empresa 3");
        }
        return null;
      },
    });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Empresa 1")).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText("Buscar empresa...");
    expect(search).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "Empresa 3" } });
    // Busca é debounced (300ms) — sem avançar o relógio, ainda mostra o
    // resultado anterior (nenhum request novo disparado ainda).
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(screen.getByText("Empresa 3")).toBeInTheDocument();
    });
    expect(screen.queryByText("Empresa 1")).not.toBeInTheDocument();
  });

  it("permite trocar de aba entre Ativas/Encerradas/Todas", async () => {
    mockApi({
      organizations: [fakeOrg({ name: "Empresa Ativa" })],
      organizationsByUrl: (url) => {
        if (url.includes("status=frozen")) return [fakeOrg({ name: "Empresa Encerrada", status: "frozen" })];
        return null;
      },
    });

    render(<OrganizationsPage />);
    await waitFor(() => {
      expect(screen.getByText("Empresa Ativa")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Encerradas" }));

    await waitFor(() => {
      expect(screen.getByText("Empresa Encerrada")).toBeInTheDocument();
    });
    expect(screen.queryByText("Empresa Ativa")).not.toBeInTheDocument();
  });

  it("permite criar uma nova empresa pelo formulário", async () => {
    let created = false;
    mockApi({
      organizationsByUrl: () => (created ? [fakeOrg({ name: "Nova Empresa Criada" })] : []),
    });
    vi.mocked(api.post).mockImplementation(async () => {
      created = true;
      return fakeOrg({ name: "Nova Empresa Criada" });
    });

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

  it("mostra os indicadores de cada empresa vindos de GET /organizations/summary", async () => {
    const orgA = fakeOrg({ name: "Empresa A" });
    mockApi({
      organizations: [orgA],
      summary: [
        {
          organization_id: orgA.id,
          revenue: { value: 42850, is_applicable: true, reason: null },
          conversion_rate: { value: 0.084, is_applicable: true, reason: null },
          cac: { value: 145.5, is_applicable: true, reason: null },
          leads: 328,
        },
      ],
    });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("42.850")).toBeInTheDocument();
    });
    expect(screen.getByText("328")).toBeInTheDocument();
  });

  it("continua mostrando a lista normalmente se GET /organizations/summary falhar", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes("/auth/me")) return Promise.resolve(FAKE_USER);
      if (path.includes("/organizations/summary")) return Promise.reject(new Error("falhou"));
      if (path.includes("/api/v1/organizations")) return Promise.resolve(page([fakeOrg({ name: "Empresa Sem Resumo" })]));
      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    render(<OrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Empresa Sem Resumo")).toBeInTheDocument();
    });
    expect(screen.queryByText("Receita")).not.toBeInTheDocument();
  });
});
