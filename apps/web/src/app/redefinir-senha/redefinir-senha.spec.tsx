import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import ResetPasswordPage from "./page";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

afterEach(() => {
  cleanup();
  mockSearchParams = new URLSearchParams();
  vi.mocked(api.post).mockReset();
});

describe("ResetPasswordPage", () => {
  it("sem token na URL, mostra estado de link invalido", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole("heading", { name: "Link inválido" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Solicitar um novo link/ })).toHaveAttribute(
      "href",
      "/esqueci-senha"
    );
  });

  it("com token, mostra o formulario de nova senha", () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    render(<ResetPasswordPage />);
    expect(screen.getByLabelText("Nova senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar nova senha")).toBeInTheDocument();
  });

  it("senhas diferentes mostram erro sem chamar a API", () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "SenhaForte123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "Diferente123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(screen.getByRole("alert")).toHaveTextContent("As senhas não coincidem.");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("sucesso mostra a confirmacao e envia token + nova senha para a API", async () => {
    mockSearchParams = new URLSearchParams("token=abc123");
    vi.mocked(api.post).mockResolvedValue({ message: "Senha redefinida com sucesso." });
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "SenhaForte123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "SenhaForte123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Senha alterada com sucesso" })).toBeInTheDocument();
    });
    expect(api.post).toHaveBeenCalledWith("/api/v1/auth/password-reset/confirm", {
      token: "abc123",
      new_password: "SenhaForte123!",
    });
    expect(screen.getByRole("link", { name: "Ir para o login" })).toHaveAttribute("href", "/login");
  });

  it("token invalido/expirado mostra o erro da API", async () => {
    mockSearchParams = new URLSearchParams("token=expirado");
    vi.mocked(api.post).mockRejectedValue(new ApiError(400, "Token invalido ou expirado"));
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "SenhaForte123!" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "SenhaForte123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Token invalido ou expirado");
    });
  });
});
