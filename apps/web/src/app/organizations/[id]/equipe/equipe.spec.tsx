import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { OrganizationProvider } from "@/contexts/organization-context";
import type { Membership, MembershipRole, Organization } from "@/lib/types";
import TeamPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-1" }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
  };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.patch).mockReset();
  vi.mocked(api.del).mockReset();
});

function member(id: string, userId: string, name: string, role: MembershipRole): Membership {
  return {
    id,
    user_id: userId,
    organization_id: "org-1",
    role,
    status: "active",
    created_at: new Date().toISOString(),
    user_name: name,
    user_email: `${name.toLowerCase().split(" ")[0]}@example.com`,
  };
}

const ME = member("m-me", "u-me", "Eu Admin", "ORGANIZATION_ADMIN");
const OWNER = member("m-owner", "u-owner", "Olga Dona", "ORGANIZATION_OWNER");
const ANALYST = member("m-ana", "u-ana", "Ana Analista", "ANALYST");

function mockLoad(members: Membership[]) {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === "/api/v1/auth/me") return { id: "u-me", name: "Eu Admin", email: "eu@example.com" };
    return members;
  });
}

function renderPage(myRole: MembershipRole = "ORGANIZATION_ADMIN") {
  const organization = { id: "org-1", name: "Acme", my_role: myRole } as Organization;
  return render(
    <OrganizationProvider
      value={{ organization, loading: false, error: null, onOrganizationUpdate: () => undefined }}
    >
      <TeamPage />
    </OrganizationProvider>
  );
}

describe("TeamPage", () => {
  it("lista os membros e marca a própria linha", async () => {
    mockLoad([ME, ANALYST]);
    renderPage();

    expect(await screen.findByText("Ana Analista")).toBeInTheDocument();
    expect(screen.getByText("(você)")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/v1/organizations/org-1/memberships");
  });

  it("não oferece alterar nem revogar a própria linha nem quem tem papel superior", async () => {
    mockLoad([ME, OWNER, ANALYST]);
    renderPage();
    await screen.findByText("Ana Analista");

    // só a Ana (papel inferior) é gerenciável
    expect(screen.getAllByRole("combobox", { name: /Papel — / })).toHaveLength(1);
    expect(screen.getByRole("combobox", { name: "Papel — Ana Analista" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revogar — Olga Dona" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revogar — Eu Admin" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revogar — Ana Analista" })).toBeInTheDocument();
  });

  it("só oferece papéis iguais ou inferiores ao do usuário", async () => {
    mockLoad([ME, ANALYST]);
    renderPage();
    await screen.findByText("Ana Analista");

    const select = screen.getByRole("combobox", { name: "Papel — Ana Analista" });
    const options = within(select).getAllByRole("option");
    expect(options).toHaveLength(3); // sem "dono"
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual([
      "ORGANIZATION_ADMIN",
      "ANALYST",
      "VIEWER",
    ]);
  });

  it("altera o papel de um membro", async () => {
    mockLoad([ME, ANALYST]);
    vi.mocked(api.patch).mockResolvedValue({ ...ANALYST, role: "VIEWER" });
    renderPage();
    await screen.findByText("Ana Analista");

    fireEvent.change(screen.getByRole("combobox", { name: "Papel — Ana Analista" }), {
      target: { value: "VIEWER" },
    });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/api/v1/organizations/org-1/memberships/m-ana", {
        role: "VIEWER",
      });
    });
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Papel — Ana Analista" })).toHaveValue("VIEWER")
    );
  });

  it("mostra o erro do backend quando a troca de papel falha", async () => {
    mockLoad([ME, ANALYST]);
    vi.mocked(api.patch).mockRejectedValue(new ApiError(403, "Sem permissão para este papel"));
    renderPage();
    await screen.findByText("Ana Analista");

    fireEvent.change(screen.getByRole("combobox", { name: "Papel — Ana Analista" }), {
      target: { value: "VIEWER" },
    });

    expect(await screen.findByText("Sem permissão para este papel")).toBeInTheDocument();
  });

  it("convida um e-mail novo e mostra o link de definir senha", async () => {
    mockLoad([ME]);
    const created = { ...member("m-new", "u-new", "Novo Funcionário", "VIEWER"), user_email: "novo@example.com", dev_token: "token-abc-123" };
    vi.mocked(api.post).mockResolvedValue(created);
    renderPage();
    await screen.findByText("Eu Admin");

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "novo@example.com" } });
    fireEvent.change(screen.getByLabelText("Nome (se ainda não tiver conta)"), {
      target: { value: "Novo Funcionário" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Convidar pessoa" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/organizations/org-1/memberships", {
        email: "novo@example.com",
        name: "Novo Funcionário",
        role: "VIEWER",
      });
    });
    expect(await screen.findByText("Acesso concedido a novo@example.com.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /redefinir-senha\?token=token-abc-123/ })).toHaveAttribute(
      "href",
      "/redefinir-senha?token=token-abc-123"
    );
  });

  it("revoga o acesso só depois de confirmar", async () => {
    mockLoad([ME, ANALYST]);
    vi.mocked(api.del).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Ana Analista");

    fireEvent.click(screen.getByRole("button", { name: "Revogar — Ana Analista" }));
    expect(api.del).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Revogar o acesso de Ana Analista?")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Revogar" }));

    await waitFor(() => {
      expect(api.del).toHaveBeenCalledWith("/api/v1/organizations/org-1/memberships/m-ana");
    });
    await waitFor(() => expect(screen.queryByText("Ana Analista")).not.toBeInTheDocument());
  });

  it("mostra o erro quando a equipe não carrega", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(500, "Falhou"));
    renderPage();
    expect(await screen.findByText("Falhou")).toBeInTheDocument();
  });
});
