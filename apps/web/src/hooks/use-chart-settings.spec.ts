import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChartSettings } from "./use-chart-settings";

type TestSettings = { value: number };

function settingsForPreset(preset: string): TestSettings {
  return { value: { default: 1, compact: 2, analytical: 3, presentation: 4 }[preset] ?? 0 };
}

describe("useChartSettings", () => {
  it("começa aplicado no preset default, dialog fechado", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    expect(result.current.active).toEqual({ value: 1 });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.draft).toBeNull();
  });

  it("abrir cria um rascunho igual ao aplicado, no preset default", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.draft).toEqual({ value: 1 });
    expect(result.current.preset).toBe("default");
  });

  it("trocar preset atualiza o rascunho, mas não o aplicado (preview ao vivo)", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    act(() => result.current.open());
    act(() => result.current.changePreset("analytical"));
    expect(result.current.active).toEqual({ value: 3 }); // active reflete o rascunho enquanto aberto
    expect(result.current.draft).toEqual({ value: 3 });
  });

  it("aplicar copia o rascunho pro estado aplicado e fecha o dialog", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    act(() => result.current.open());
    act(() => result.current.changePreset("compact"));
    act(() => result.current.apply());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.active).toEqual({ value: 2 });
  });

  it("cancelar descarta o rascunho, aplicado continua o de antes", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    act(() => result.current.open());
    act(() => result.current.changePreset("presentation"));
    act(() => result.current.cancel());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.active).toEqual({ value: 1 });
  });

  it("restaurar padrão volta o rascunho pro preset default sem fechar o dialog", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    act(() => result.current.open());
    act(() => result.current.changePreset("analytical"));
    act(() => result.current.reset());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.preset).toBe("default");
    expect(result.current.draft).toEqual({ value: 1 });
  });

  it("reabrir depois de aplicar um preset mostra esse preset selecionado, não sempre 'default'", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    act(() => result.current.open());
    act(() => result.current.changePreset("analytical"));
    act(() => result.current.apply());

    act(() => result.current.open());
    expect(result.current.preset).toBe("analytical");
    expect(result.current.draft).toEqual({ value: 3 });
  });

  it("sem correspondência exata a nenhum preset (ajuste avulso), reabrir cai em 'default'", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    act(() => result.current.open());
    act(() => result.current.updateDraft(() => ({ value: 42 })));
    act(() => result.current.apply());

    act(() => result.current.open());
    expect(result.current.preset).toBe("default");
  });

  it("updateDraft muda um campo do rascunho sem depender de um preset", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    act(() => result.current.open());
    act(() => result.current.updateDraft((d) => ({ ...d, value: 99 })));
    expect(result.current.draft).toEqual({ value: 99 });
  });
});
