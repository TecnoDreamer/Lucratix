import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import AdminLayout from "./layout";

let mockPathname = "/admin/organizations";
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

const PLATFORM_ADMIN: User = {
  id: "admin-1",
  name: "Super Admin",
  email: "admin@example.com",
  is_platform_admin: true,
  email_verified: true,
  locale: null,
};

const REGULAR_USER: User = {
  id: "user-1",
  name: "Usuário Comum",
  email: "comum@example.com",
  is_platform_admin: false,
  email_verified: true,
  locale: null,
};

afterEach(() => {
  cleanup();
  mockPathname = "/admin/organizations";
  mockPush.mockReset();
  mockReplace.mockReset();
  vi.mocked(api.get).mockReset();
});

describe("AdminLayout — guarda de acesso", () => {
  it("renderiza o painel para quem é Super Admin", async () => {
    vi.mocked(api.get).mockResolvedValue(PLATFORM_ADMIN);
    render(
      <AdminLayout>
        <p>conteudo do painel</p>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getByText("conteudo do painel")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Painel Admin" })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("nunca renderiza o painel e redireciona quem não é Super Admin", async () => {
    vi.mocked(api.get).mockResolvedValue(REGULAR_USER);
    render(
      <AdminLayout>
        <p>conteudo do painel</p>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/organizations");
    });
    expect(screen.queryByText("conteudo do painel")).not.toBeInTheDocument();
  });

  it("401 redireciona para o login", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(401, "Nao autenticado"));
    render(
      <AdminLayout>
        <p>conteudo do painel</p>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("marca a secao ativa na navegação", async () => {
    mockPathname = "/admin/users";
    vi.mocked(api.get).mockResolvedValue(PLATFORM_ADMIN);
    render(
      <AdminLayout>
        <p>conteudo</p>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /Usuários/ })[0]).toHaveAttribute(
        "aria-current",
        "page"
      );
    });
  });
});
