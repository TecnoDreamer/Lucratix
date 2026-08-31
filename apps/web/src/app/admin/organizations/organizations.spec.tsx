import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { PlatformOrganization } from "@/lib/platform-admin";
import AdminOrganizationsPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
});

const ORGS: PlatformOrganization[] = [
  {
    id: "org-1",
    name: "Empresa Alpha",
    created_at: new Date().toISOString(),
    owner_name: "Dona Alpha",
    owner_email: "dona@alpha.example.com",
    member_count: 3,
  },
  {
    id: "org-2",
    name: "Empresa Beta",
    created_at: new Date().toISOString(),
    owner_name: null,
    owner_email: null,
    member_count: 0,
  },
];

describe("AdminOrganizationsPage", () => {
  it("lista todas as empresas com dono e nº de membros", async () => {
    vi.mocked(api.get).mockResolvedValue(ORGS);
    render(<AdminOrganizationsPage />);

    expect(await screen.findByText("Empresa Alpha")).toBeInTheDocument();
    expect(screen.getByText(/Dono: Dona Alpha \(dona@alpha.example.com\)/)).toBeInTheDocument();
    expect(screen.getByText("Empresa Beta")).toBeInTheDocument();
    expect(screen.getByText(/Sem proprietário definido/)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Empresa Alpha/ })).toHaveAttribute(
      "href",
      "/admin/organizations/org-1"
    );
  });

  it("estado vazio quando não há nenhuma empresa", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    render(<AdminOrganizationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Nenhuma empresa cadastrada ainda.")).toBeInTheDocument();
    });
  });
});
