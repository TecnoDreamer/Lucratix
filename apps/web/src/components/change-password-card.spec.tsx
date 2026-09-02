import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { ChangePasswordCard } from "./change-password-card";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.post).mockReset();
});

function fillAndSubmit(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: current } });
  fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: next } });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
}

describe("ChangePasswordCard", () => {
  it("mostra o checklist de requisitos em tempo real para a senha nova", () => {
    render(<ChangePasswordCard />);
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "abc" } });
    expect(screen.getByText("8 ou mais caracteres")).toBeInTheDocument();
    expect(screen.getByText("Uma letra maiúscula")).toBeInTheDocument();
    expect(screen.getByText("Um caractere especial")).toBeInTheDocument();
    expect(screen.getByText("Pelo menos 3 números")).toBeInTheDocument();
  });

  it("senha nova e confirmação diferentes mostram erro sem chamar a API", () => {
    render(<ChangePasswordCard />);
    fillAndSubmit("SenhaAntiga123!", "SenhaNova123!", "Diferente123!");

    expect(screen.getByRole("alert")).toHaveTextContent("As senhas não coincidem.");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("sucesso envia current_password/new_password e mostra a confirmação", async () => {
    vi.mocked(api.post).mockResolvedValue({ message: "Senha alterada com sucesso." });
    render(<ChangePasswordCard />);

    fillAndSubmit("SenhaAntiga123!", "SenhaNova123!", "SenhaNova123!");

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/auth/change-password", {
        current_password: "SenhaAntiga123!",
        new_password: "SenhaNova123!",
      });
    });
    expect(await screen.findByText("Senha alterada com sucesso.")).toBeInTheDocument();
    // Campos limpos apos sucesso.
    expect(screen.getByLabelText("Senha atual")).toHaveValue("");
    expect(screen.getByLabelText("Nova senha")).toHaveValue("");
  });

  it("senha atual incorreta mostra o erro do backend", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(401, "Senha atual incorreta"));
    render(<ChangePasswordCard />);

    fillAndSubmit("errada", "SenhaNova123!", "SenhaNova123!");

    expect(await screen.findByText("Senha atual incorreta")).toBeInTheDocument();
  });

  it("senha nova fraca mostra o erro do backend listando os requisitos faltando", async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ApiError(400, "A senha deve ter pelo menos uma letra maiúscula; pelo menos um caractere especial.")
    );
    render(<ChangePasswordCard />);

    fillAndSubmit("SenhaAntiga123!", "senhafraca123", "senhafraca123");

    expect(
      await screen.findByText("A senha deve ter pelo menos uma letra maiúscula; pelo menos um caractere especial.")
    ).toBeInTheDocument();
  });
});
