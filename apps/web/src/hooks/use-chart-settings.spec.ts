import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChartSettings, type ChartSettingsPersistence } from "./use-chart-settings";
import { fetchChartPreferences } from "@/lib/chart-preferences";

vi.mock("@/lib/chart-preferences", () => ({
  fetchChartPreferences: vi.fn(),
}));

afterEach(() => {
  vi.mocked(fetchChartPreferences).mockReset();
});

type TestSettings = { value: number };

function settingsForPreset(preset: string): TestSettings {
  return { value: { default: 1, compact: 2, analytical: 3, presentation: 4 }[preset] ?? 0 };
}

function makePersistence(
  overrides?: Partial<ChartSettingsPersistence<TestSettings>>
): ChartSettingsPersistence<TestSettings> {
  return {
    organizationId: "org-1",
    chartKey: "funnel-stages",
    sanitize: (raw) =>
      raw && typeof raw === "object" && "value" in raw ? (raw as TestSettings) : null,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
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

  it("sem persistence, nunca busca preferência salva (comportamento igual ao de antes da PR3)", () => {
    const { result } = renderHook(() => useChartSettings(settingsForPreset));
    expect(fetchChartPreferences).not.toHaveBeenCalled();
    expect(result.current.active).toEqual({ value: 1 });
  });
});

describe("useChartSettings — persistência (PR3)", () => {
  it("sem preferência salva (GET devolve null), mantém o preset default", async () => {
    vi.mocked(fetchChartPreferences).mockResolvedValue({
      organization_id: "org-1",
      chart_key: "funnel-stages",
      preferences: null,
      updated_at: null,
    });
    const persistence = makePersistence();
    const { result } = renderHook(() => useChartSettings(settingsForPreset, persistence));

    await waitFor(() => expect(fetchChartPreferences).toHaveBeenCalledWith("org-1", "funnel-stages"));
    expect(result.current.active).toEqual({ value: 1 });
  });

  it("carrega a preferência salva no mount e substitui o default", async () => {
    vi.mocked(fetchChartPreferences).mockResolvedValue({
      organization_id: "org-1",
      chart_key: "funnel-stages",
      preferences: { value: 3 },
      updated_at: "2026-09-08T00:00:00Z",
    });
    const persistence = makePersistence();
    const { result } = renderHook(() => useChartSettings(settingsForPreset, persistence));

    await waitFor(() => expect(result.current.active).toEqual({ value: 3 }));
    // Reabrir mostra o preset correspondente ao valor carregado, não sempre "default".
    act(() => result.current.open());
    expect(result.current.preset).toBe("analytical");
  });

  it("preferência salva em formato que o sanitizador rejeita mantém o default", async () => {
    vi.mocked(fetchChartPreferences).mockResolvedValue({
      organization_id: "org-1",
      chart_key: "funnel-stages",
      preferences: { foo: "bar" },
      updated_at: "2026-09-08T00:00:00Z",
    });
    const persistence = makePersistence();
    const { result } = renderHook(() => useChartSettings(settingsForPreset, persistence));

    await waitFor(() => expect(fetchChartPreferences).toHaveBeenCalled());
    expect(result.current.active).toEqual({ value: 1 });
  });

  it("falha ao carregar a preferência (rede) mantém o default sem quebrar", async () => {
    vi.mocked(fetchChartPreferences).mockRejectedValue(new Error("network"));
    const persistence = makePersistence();
    const { result } = renderHook(() => useChartSettings(settingsForPreset, persistence));

    await waitFor(() => expect(fetchChartPreferences).toHaveBeenCalled());
    expect(result.current.active).toEqual({ value: 1 });
  });

  it("apply() salva o rascunho aplicado (melhor esforço)", async () => {
    vi.mocked(fetchChartPreferences).mockResolvedValue({
      organization_id: "org-1",
      chart_key: "funnel-stages",
      preferences: null,
      updated_at: null,
    });
    const persistence = makePersistence();
    const { result } = renderHook(() => useChartSettings(settingsForPreset, persistence));
    await waitFor(() => expect(fetchChartPreferences).toHaveBeenCalled());

    act(() => result.current.open());
    act(() => result.current.changePreset("compact"));
    act(() => result.current.apply());

    expect(persistence.save).toHaveBeenCalledWith("org-1", { value: 2 });
  });

  it("falha no save não desfaz o apply local nem quebra a UI", async () => {
    vi.mocked(fetchChartPreferences).mockResolvedValue({
      organization_id: "org-1",
      chart_key: "funnel-stages",
      preferences: null,
      updated_at: null,
    });
    const persistence = makePersistence({ save: vi.fn().mockRejectedValue(new Error("network")) });
    const { result } = renderHook(() => useChartSettings(settingsForPreset, persistence));
    await waitFor(() => expect(fetchChartPreferences).toHaveBeenCalled());

    act(() => result.current.open());
    act(() => result.current.changePreset("analytical"));
    act(() => result.current.apply());

    expect(result.current.active).toEqual({ value: 3 });
  });
});
