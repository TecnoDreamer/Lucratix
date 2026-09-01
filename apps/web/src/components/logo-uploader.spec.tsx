import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { Organization } from "@/lib/types";
import { LogoUploader } from "./logo-uploader";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, postForm: vi.fn(), del: vi.fn() } };
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

afterEach(() => {
  cleanup();
  vi.mocked(api.postForm).mockReset();
  vi.mocked(api.del).mockReset();
});

describe("LogoUploader", () => {
  it("mostra preview local ao selecionar um arquivo", () => {
    render(<LogoUploader organization={fakeOrg()} onUpdated={vi.fn()} />);
    const file = new File(["conteudo"], "logo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByAltText("Pré-visualização do logotipo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar logotipo" })).toBeInTheDocument();
  });

  it("'Salvar logotipo' envia FormData e chama onUpdated", async () => {
    const updated = fakeOrg({ logo_url: "https://res.cloudinary.com/demo/logo.png" });
    vi.mocked(api.postForm).mockResolvedValue(updated);
    const onUpdated = vi.fn();
    render(<LogoUploader organization={fakeOrg()} onUpdated={onUpdated} />);

    const file = new File(["conteudo"], "logo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar logotipo" }));

    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalledWith(updated);
    });
    const [path, formData] = vi.mocked(api.postForm).mock.calls[0];
    expect(path).toBe("/api/v1/organizations/org-1/logo");
    expect(formData.get("file")).toBeInstanceOf(File);
  });

  it("erro no envio mantém o logo anterior e mostra a mensagem", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.mocked(api.postForm).mockRejectedValue(new ApiError(400, "Imagem inválida."));
    const onUpdated = vi.fn();
    render(<LogoUploader organization={fakeOrg()} onUpdated={onUpdated} />);

    const file = new File(["conteudo"], "logo.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar logotipo" }));

    expect(await screen.findByText("Imagem inválida.")).toBeInTheDocument();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("'Remover logotipo' aparece só quando já existe logo, e chama DELETE", async () => {
    const withLogo = fakeOrg({ logo_url: "https://res.cloudinary.com/demo/logo.png" });
    const afterRemoval = fakeOrg({ logo_url: null });
    vi.mocked(api.del).mockResolvedValue(afterRemoval);
    const onUpdated = vi.fn();

    const { rerender } = render(<LogoUploader organization={fakeOrg()} onUpdated={onUpdated} />);
    expect(screen.queryByRole("button", { name: /Remover logotipo/ })).not.toBeInTheDocument();

    rerender(<LogoUploader organization={withLogo} onUpdated={onUpdated} />);
    fireEvent.click(screen.getByRole("button", { name: /Remover logotipo/ }));

    await waitFor(() => {
      expect(api.del).toHaveBeenCalledWith("/api/v1/organizations/org-1/logo");
    });
    expect(onUpdated).toHaveBeenCalledWith(afterRemoval);
  });
});
