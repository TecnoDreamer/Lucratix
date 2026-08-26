import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import type { Organization } from "@/lib/types";
import OrganizationLayout from "./layout";

let mockPathname = "/organizations/org-123/dashboard";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

const FAKE_ORG: Organization = {
  id: "org-123",
  name: "Empresa Teste",
  trade_name: null,
  segment: null,
  cnpj: null,
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  tracking_start_date: null,
  notes: null,
  created_at: new Date().toISOString(),
  my_role: "ORGANIZATION_OWNER",
};

afterEach(() => {
  cleanup();
  mockPathname = "/organizations/org-123/dashboard";
  vi.mocked(api.get).mockReset();
});

describe("OrganizationLayout — sidebar", () => {
  it("mostra o nome e o papel da empresa depois de carregar", async () => {
    vi.mocked(api.get).mockResolvedValue(FAKE_ORG);
    render(
      <OrganizationLayout>
        <p>conteudo</p>
      </OrganizationLayout>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Empresa Teste" })).toBeInTheDocument();
    });
    expect(screen.getByText("Seu papel: ORGANIZATION_OWNER")).toBeInTheDocument();
  });

  it("sidebar mostra todos os itens de navegação, incluindo Glossário", async () => {
    vi.mocked(api.get).mockResolvedValue(FAKE_ORG);
    render(
      <OrganizationLayout>
        <p>conteudo</p>
      </OrganizationLayout>
    );

    for (const label of [
      "Dashboard",
      "Analytics",
      "Produtos",
      "Financeiro",
      "Marketing",
      "Funil",
      "Experimentos",
      "Relatório",
      "Auditoria",
      "Glossário",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeVisible();
    }
  });

  it("marca a rota ativa com aria-current", async () => {
    mockPathname = "/organizations/org-123/financials";
    vi.mocked(api.get).mockResolvedValue(FAKE_ORG);
    render(
      <OrganizationLayout>
        <p>conteudo</p>
      </OrganizationLayout>
    );

    expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("renderiza o conteudo filho", async () => {
    vi.mocked(api.get).mockResolvedValue(FAKE_ORG);
    render(
      <OrganizationLayout>
        <p>conteudo da pagina</p>
      </OrganizationLayout>
    );
    expect(screen.getByText("conteudo da pagina")).toBeInTheDocument();
  });

  it("abre o drawer mobile pelo botao hamburguer e fecha pelo X", async () => {
    vi.mocked(api.get).mockResolvedValue(FAKE_ORG);
    render(
      <OrganizationLayout>
        <p>conteudo</p>
      </OrganizationLayout>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("dialog", { name: "Menu de navegação" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar menu" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape fecha o drawer mobile", async () => {
    vi.mocked(api.get).mockResolvedValue(FAKE_ORG);
    render(
      <OrganizationLayout>
        <p>conteudo</p>
      </OrganizationLayout>
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("clicar no overlay fecha o drawer", async () => {
    vi.mocked(api.get).mockResolvedValue(FAKE_ORG);
    render(
      <OrganizationLayout>
        <p>conteudo</p>
      </OrganizationLayout>
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    const dialog = screen.getByRole("dialog");

    // O overlay e o irmao anterior do dialog no mesmo wrapper (nao tem role
    // proprio por ser decorativo — aria-hidden tambem aparece nos icones
    // SVG da propria sidebar, entao nao da pra usar esse atributo sozinho
    // como seletor global).
    const overlay = dialog.previousElementSibling;
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay as Element);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra a mensagem de empresa nao encontrada quando a API retorna 404", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(404, "Nao encontrada"));

    render(
      <OrganizationLayout>
        <p>conteudo</p>
      </OrganizationLayout>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Empresa nao encontrada ou voce nao tem acesso a ela.")
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });
});
