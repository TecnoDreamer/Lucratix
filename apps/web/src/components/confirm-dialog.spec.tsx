import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

afterEach(() => {
  cleanup();
});

describe("ConfirmDialog", () => {
  it("não renderiza nada quando fechado", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Título"
        confirmLabel="Confirmar"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza com role=dialog e aria-modal quando aberto", () => {
    render(
      <ConfirmDialog
        open
        title="Encerrar empresa?"
        description="Os dados não serão apagados."
        confirmLabel="Encerrar"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Encerrar empresa?")).toBeInTheDocument();
    expect(screen.getByText("Os dados não serão apagados.")).toBeInTheDocument();
  });

  it("Escape chama onCancel", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="T" confirmLabel="C" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clicar no backdrop chama onCancel", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog open title="T" confirmLabel="C" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clicar em confirmar chama onConfirm", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open title="T" confirmLabel="Encerrar" onConfirm={onConfirm} onCancel={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Encerrar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("desabilita os botões enquanto confirming", () => {
    render(
      <ConfirmDialog
        open
        title="T"
        confirmLabel="Encerrar"
        confirming
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aguarde..." })).toBeDisabled();
  });

  it("mostra a mensagem de erro quando presente", () => {
    render(
      <ConfirmDialog
        open
        title="T"
        confirmLabel="C"
        error="Algo deu errado."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText("Algo deu errado.")).toBeInTheDocument();
  });

  it("renderiza children dentro do diálogo", () => {
    render(
      <ConfirmDialog open title="T" confirmLabel="C" onConfirm={vi.fn()} onCancel={vi.fn()}>
        <p>Conteúdo extra</p>
      </ConfirmDialog>
    );
    expect(screen.getByText("Conteúdo extra")).toBeInTheDocument();
  });
});
