import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import ConfirmEmailPage from "./page";

let mockToken: string | null = "token-valido";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "token" ? mockToken : null) }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

afterEach(() => {
  cleanup();
  mockToken = "token-valido";
  vi.mocked(api.post).mockReset();
});

describe("ConfirmEmailPage", () => {
  it("confirma automaticamente ao carregar e mostra sucesso", async () => {
    vi.mocked(api.post).mockResolvedValue({ message: "E-mail confirmado com sucesso." });
    render(<ConfirmEmailPage />);

    expect(await screen.findByText("E-mail confirmado")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/api/v1/auth/verify-email", { token: "token-valido" });
    expect(screen.getByRole("link", { name: "Ir para Suas empresas" })).toHaveAttribute(
      "href",
      "/organizations"
    );
  });

  it("mostra erro quando o token é inválido/expirado", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(400, "Token invalido ou expirado"));
    render(<ConfirmEmailPage />);

    expect(await screen.findByText("Link inválido")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Token invalido ou expirado")).toBeInTheDocument();
    });
  });

  it("sem token na URL, mostra erro sem chamar a API", async () => {
    mockToken = null;
    render(<ConfirmEmailPage />);

    expect(await screen.findByText("Link inválido")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
