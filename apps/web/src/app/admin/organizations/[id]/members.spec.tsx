import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import type { Membership } from "@/lib/types";
import AdminOrganizationMembersPage from "./page";

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

const MEMBER: Membership = {
  id: "m-1",
  user_id: "u-1",
  organization_id: "org-1",
  role: "ANALYST",
  status: "active",
  created_at: new Date().toISOString(),
  user_name: "Ana Analista",
  user_email: "ana@example.com",
};

describe("AdminOrganizationMembersPage", () => {
  it("lista os membros da empresa", async () => {
    vi.mocked(api.get).mockResolvedValue([MEMBER]);
    render(<AdminOrganizationMembersPage />);

    expect(await screen.findByText("Ana Analista")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });

  it("concede acesso a um e-mail novo e mostra o link de definir senha", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const created: Membership = {
      id: "m-2",
      user_id: "u-2",
      organization_id: "org-1",
      role: "VIEWER",
      status: "active",
      created_at: new Date().toISOString(),
      user_name: "Novo Funcionário",
      user_email: "novo@example.com",
      dev_token: "token-abc-123",
    };
    vi.mocked(api.post).mockResolvedValue(created);

    render(<AdminOrganizationMembersPage />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "novo@example.com" } });
    fireEvent.change(screen.getByLabelText("Nome (se ainda não tiver conta)"), {
      target: { value: "Novo Funcionário" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Conceder acesso" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/platform/organizations/org-1/memberships", {
        email: "novo@example.com",
        name: "Novo Funcionário",
        role: "ANALYST",
      });
    });

    expect(await screen.findByText(/Novo Funcionário/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /redefinir-senha\?token=token-abc-123/ });
    expect(link).toHaveAttribute("href", "/redefinir-senha?token=token-abc-123");
  });

  it("altera o papel de um membro", async () => {
    vi.mocked(api.get).mockResolvedValue([MEMBER]);
    vi.mocked(api.patch).mockResolvedValue({ ...MEMBER, role: "ORGANIZATION_ADMIN" });

    render(<AdminOrganizationMembersPage />);
    await screen.findByText("Ana Analista");

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "ORGANIZATION_ADMIN" } });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        "/api/v1/platform/organizations/org-1/memberships/m-1",
        { role: "ORGANIZATION_ADMIN" }
      );
    });
  });

  it("revoga o acesso de um membro", async () => {
    vi.mocked(api.get).mockResolvedValue([MEMBER]);
    vi.mocked(api.del).mockResolvedValue(undefined);

    render(<AdminOrganizationMembersPage />);
    await screen.findByText("Ana Analista");

    fireEvent.click(screen.getByRole("button", { name: /Revogar/ }));

    await waitFor(() => {
      expect(api.del).toHaveBeenCalledWith("/api/v1/platform/organizations/org-1/memberships/m-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("Ana Analista")).not.toBeInTheDocument();
    });
  });

  it("mostra erro quando conceder acesso falha", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockRejectedValue(new ApiError(400, "informe o nome"));

    render(<AdminOrganizationMembersPage />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "semnome@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Conceder acesso" }));

    expect(await screen.findByText("informe o nome")).toBeInTheDocument();
  });
});
