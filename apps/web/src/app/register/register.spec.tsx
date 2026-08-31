import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import RegisterPage from "./page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

afterEach(() => {
  cleanup();
  mockPush.mockReset();
  vi.mocked(api.post).mockReset();
});

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "SenhaForte123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));
}

describe("RegisterPage", () => {
  it("cadastra e redireciona pro login quando não há dev_token (e-mail de verdade enviado)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api.post).mockResolvedValue({ message: "Cadastro recebido..." });
    render(<RegisterPage />);

    fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText("Cadastro recebido...")).toBeInTheDocument();
    });
    vi.advanceTimersByTime(1600);
    expect(mockPush).toHaveBeenCalledWith("/login");
    vi.useRealTimers();
  });

  it("em modo dev, mostra o link de continuar para confirmar o e-mail e NÃO redireciona sozinho", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api.post).mockResolvedValue({
      message: "Cadastro recebido...",
      dev_token: "token-de-verificacao",
    });
    render(<RegisterPage />);

    fillAndSubmit();

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /Continuar para confirmar o e-mail/ })
      ).toHaveAttribute("href", "/confirmar-email?token=token-de-verificacao");
    });
    vi.advanceTimersByTime(3000);
    expect(mockPush).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("mostra erro quando a API falha", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(500, "Erro interno"));
    render(<RegisterPage />);

    fillAndSubmit();

    expect(await screen.findByText("Erro interno")).toBeInTheDocument();
  });
});
