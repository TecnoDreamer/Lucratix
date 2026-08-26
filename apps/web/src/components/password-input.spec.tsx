import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordInput } from "./password-input";

// jsdom nao suporta getModifierState (nem via propriedade extra no evento
// sintetico do React) — mocka no prototype, ligado/desligado por teste.
function mockCapsLock(active: boolean) {
  vi.spyOn(KeyboardEvent.prototype, "getModifierState").mockReturnValue(active);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Wrapper({
  autoComplete = "current-password",
}: {
  autoComplete?: "current-password" | "new-password";
}) {
  const [value, setValue] = useState("");
  return (
    <PasswordInput
      label="Senha"
      value={value}
      onChange={setValue}
      autoComplete={autoComplete}
    />
  );
}

describe("PasswordInput", () => {
  it("comeca com o tipo password e o gatilho 'Mostrar senha'", () => {
    render(<Wrapper />);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Mostrar senha" })).toBeInTheDocument();
  });

  it("clicar no gatilho alterna para texto visivel e troca o aria-label", () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeInTheDocument();
  });

  it("clicar de novo volta a ocultar a senha", () => {
    render(<Wrapper />);
    const toggle = () => screen.getByRole("button", { name: /senha/i });
    fireEvent.click(toggle());
    fireEvent.click(toggle());

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
  });

  it("digitar atualiza o valor", () => {
    render(<Wrapper />);
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "abc123" } });
    expect(screen.getByLabelText("Senha")).toHaveValue("abc123");
  });

  it("aplica o autoComplete recebido", () => {
    render(<Wrapper autoComplete="new-password" />);
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "new-password");
  });

  it("mostra aviso quando Caps Lock esta ativado", () => {
    render(<Wrapper />);
    const input = screen.getByLabelText("Senha");
    expect(screen.queryByText("Caps Lock está ativado.")).not.toBeInTheDocument();

    mockCapsLock(true);
    fireEvent.keyDown(input, { key: "a" });
    expect(screen.getByText("Caps Lock está ativado.")).toBeInTheDocument();
  });

  it("esconde o aviso de Caps Lock quando ele e desativado", () => {
    render(<Wrapper />);
    const input = screen.getByLabelText("Senha");
    mockCapsLock(true);
    fireEvent.keyDown(input, { key: "a" });
    expect(screen.getByText("Caps Lock está ativado.")).toBeInTheDocument();

    mockCapsLock(false);
    fireEvent.keyUp(input, { key: "a" });
    expect(screen.queryByText("Caps Lock está ativado.")).not.toBeInTheDocument();
  });

  it("esconde o aviso de Caps Lock ao perder o foco", () => {
    render(<Wrapper />);
    const input = screen.getByLabelText("Senha");
    mockCapsLock(true);
    fireEvent.keyDown(input, { key: "a" });
    expect(screen.getByText("Caps Lock está ativado.")).toBeInTheDocument();

    fireEvent.blur(input);
    expect(screen.queryByText("Caps Lock está ativado.")).not.toBeInTheDocument();
  });

  it("o aviso de Caps Lock nao entra no nome acessivel do campo", () => {
    render(<Wrapper />);
    const input = screen.getByLabelText("Senha");
    mockCapsLock(true);
    fireEvent.keyDown(input, { key: "a" });

    expect(screen.getByLabelText("Senha")).toBe(input);
  });
});
