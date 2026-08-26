import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import ForgotPasswordPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.post).mockReset();
});

describe("ForgotPasswordPage", () => {
  it("envia o e-mail e mostra a mensagem generica de sucesso", async () => {
    vi.mocked(api.post).mockResolvedValue({ message: "Se o e-mail informado estiver cadastrado..." });
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de redefinição" }));

    await waitFor(() => {
      expect(screen.getByText(/Se o e-mail informado estiver cadastrado/)).toBeInTheDocument();
    });
    expect(api.post).toHaveBeenCalledWith("/api/v1/auth/password-reset/request", {
      email: "ana@example.com",
    });
  });

  it("em modo dev, mostra o link direto de continuidade com o dev_token", async () => {
    vi.mocked(api.post).mockResolvedValue({
      message: "Se o e-mail informado estiver cadastrado...",
      dev_token: "token-de-teste",
    });
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de redefinição" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Continuar para redefinir a senha/ })).toHaveAttribute(
        "href",
        "/redefinir-senha?token=token-de-teste"
      );
    });
  });

  it("nao mostra o link de dev_token em producao (resposta sem o campo)", async () => {
    vi.mocked(api.post).mockResolvedValue({ message: "Se o e-mail informado estiver cadastrado..." });
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de redefinição" }));

    await waitFor(() => {
      expect(screen.getByText(/Se o e-mail informado estiver cadastrado/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Continuar para redefinir a senha/)).not.toBeInTheDocument();
  });

  it("mostra erro quando a API falha", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(429, "Muitas tentativas. Tente novamente em instantes."));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de redefinição" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Muitas tentativas");
    });
  });

  it("inclui link para voltar ao login", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/login");
  });
});
