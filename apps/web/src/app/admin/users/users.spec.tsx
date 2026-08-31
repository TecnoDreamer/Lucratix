import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { PlatformUser, PlatformUserCreateResponse } from "@/lib/platform-admin";
import type { User } from "@/lib/types";
import AdminUsersPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
  vi.mocked(api.patch).mockReset();
});

const ME: User = {
  id: "admin-1",
  name: "Super Admin",
  email: "admin@example.com",
  is_platform_admin: true,
  email_verified: true,
};

const OTHER_USER: PlatformUser = {
  id: "u-2",
  name: "Outro Usuário",
  email: "outro@example.com",
  is_active: true,
  is_platform_admin: false,
  organization_count: 2,
};

function mockGetSequence(users: PlatformUser[]) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === "/api/v1/auth/me") return Promise.resolve(ME);
    if (path === "/api/v1/platform/users") return Promise.resolve(users);
    return Promise.reject(new Error(`unexpected path ${path}`));
  });
}

describe("AdminUsersPage", () => {
  it("lista os usuários e marca o próprio usuário logado", async () => {
    mockGetSequence([{ ...ME, is_active: true, organization_count: 0 }, OTHER_USER]);
    render(<AdminUsersPage />);

    expect(await screen.findByText("Outro Usuário")).toBeInTheDocument();
    expect(screen.getByText("(você)")).toBeInTheDocument();
  });

  it("cria um usuário e mostra o link de definir senha", async () => {
    mockGetSequence([]);
    const response: PlatformUserCreateResponse = {
      user: {
        id: "u-3",
        name: "Conta Nova",
        email: "nova@example.com",
        is_active: true,
        is_platform_admin: false,
        organization_count: 0,
      },
      dev_token: "token-xyz",
    };
    vi.mocked(api.post).mockResolvedValue(response);

    render(<AdminUsersPage />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/v1/platform/users"));

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Conta Nova" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "nova@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar usuário" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/platform/users", {
        name: "Conta Nova",
        email: "nova@example.com",
      });
    });
    expect(await screen.findByText("Conta Nova")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /redefinir-senha\?token=token-xyz/ })
    ).toHaveAttribute("href", "/redefinir-senha?token=token-xyz");
  });

  it("desativa e reativa um usuário", async () => {
    mockGetSequence([{ ...ME, is_active: true, organization_count: 0 }, OTHER_USER]);
    vi.mocked(api.patch).mockResolvedValue({ ...OTHER_USER, is_active: false });

    render(<AdminUsersPage />);
    const row = (await screen.findByText("Outro Usuário")).closest("tr") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: "Desativar" }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/api/v1/platform/users/u-2", { is_active: false });
    });
  });

  it("não permite desativar nem remover o próprio super admin", async () => {
    mockGetSequence([{ ...ME, is_active: true, organization_count: 0 }]);
    render(<AdminUsersPage />);

    const row = (await screen.findByText(ME.email)).closest("tr") as HTMLElement;
    expect(within(row).getByRole("button", { name: "Desativar" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Remover super admin" })).toBeDisabled();
  });

  it("concede super admin a outro usuário", async () => {
    mockGetSequence([{ ...ME, is_active: true, organization_count: 0 }, OTHER_USER]);
    vi.mocked(api.patch).mockResolvedValue({ ...OTHER_USER, is_platform_admin: true });

    render(<AdminUsersPage />);
    const row = (await screen.findByText("Outro Usuário")).closest("tr") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: "Tornar super admin" }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/api/v1/platform/users/u-2", { is_platform_admin: true });
    });
  });
});
