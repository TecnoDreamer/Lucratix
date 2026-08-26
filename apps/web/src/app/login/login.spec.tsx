import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, SESSION_REVOKED_MESSAGE } from "@/lib/api";
import LoginPage from "./page";

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

afterEach(() => {
  cleanup();
  mockSearchParams = new URLSearchParams();
  mockPush.mockReset();
  vi.mocked(api.post).mockReset();
});

describe("LoginPage", () => {
  it("nao mostra nenhum aviso quando chegou sem motivo", () => {
    render(<LoginPage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra a mensagem de sessao encerrada quando ?reason=session_revoked", () => {
    mockSearchParams = new URLSearchParams("reason=session_revoked");
    render(<LoginPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(SESSION_REVOKED_MESSAGE);
  });

  it("ignora motivos desconhecidos", () => {
    mockSearchParams = new URLSearchParams("reason=algo-nao-mapeado");
    render(<LoginPage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("um erro de submissao substitui o aviso de sessao encerrada", async () => {
    mockSearchParams = new URLSearchParams("reason=session_revoked");
    vi.mocked(api.post).mockRejectedValue(new ApiError(401, "Credenciais invalidas"));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Credenciais invalidas");
    });
  });

  it("login bem-sucedido navega para /organizations", async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: "u1",
      name: "Ana",
      email: "ana@example.com",
      created_at: new Date().toISOString(),
    });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "SenhaForte123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/organizations");
    });
  });
});
