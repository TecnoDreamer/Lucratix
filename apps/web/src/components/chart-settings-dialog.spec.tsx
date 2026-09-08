import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartSettingsDialog } from "./chart-settings-dialog";

afterEach(() => cleanup());

function renderDialog(overrides: Partial<React.ComponentProps<typeof ChartSettingsDialog>> = {}) {
  const onPresetChange = vi.fn();
  const onApply = vi.fn();
  const onCancel = vi.fn();
  const onReset = vi.fn();
  const utils = render(
    <ChartSettingsDialog
      open
      title="Personalizar gráfico"
      preset="default"
      onPresetChange={onPresetChange}
      onApply={onApply}
      onCancel={onCancel}
      onReset={onReset}
      {...overrides}
    >
      <p>Controle específico do gráfico</p>
    </ChartSettingsDialog>
  );
  return { ...utils, onPresetChange, onApply, onCancel, onReset };
}

describe("ChartSettingsDialog", () => {
  it("fechado não renderiza nada", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra título, presets e os controles específicos passados como children", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Personalizar gráfico")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Padrão" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Compacto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analítico" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apresentação" })).toBeInTheDocument();
    expect(screen.getByText("Controle específico do gráfico")).toBeInTheDocument();
  });

  it("trocar preset chama onPresetChange com o preset escolhido", () => {
    const { onPresetChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Analítico" }));
    expect(onPresetChange).toHaveBeenCalledWith("analytical");
  });

  it("Restaurar padrão chama onReset", () => {
    const { onReset } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("Cancelar chama onCancel, nunca onApply", () => {
    const { onCancel, onApply } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("Aplicar chama onApply", () => {
    const { onApply } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("clicar no backdrop cancela (mesmo comportamento do ConfirmDialog)", () => {
    const { onCancel, container } = renderDialog();
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape cancela", () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
