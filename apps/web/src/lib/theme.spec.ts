import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getStoredTheme, setTheme, THEME_STORAGE_KEY, watchSystemTheme } from "./theme";

function mockMatchMedia(prefersDark: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("dark") ? prefersDark : false,
    media: query,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
  }));
  return { fire: () => listeners.forEach((cb) => cb({} as MediaQueryListEvent)) };
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getStoredTheme", () => {
  it("retorna 'system' quando nao ha nada salvo", () => {
    expect(getStoredTheme()).toBe("system");
  });

  it("retorna o valor salvo quando valido", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getStoredTheme()).toBe("dark");
  });

  it("ignora valor invalido no localStorage e volta para 'system'", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "roxo-neon");
    expect(getStoredTheme()).toBe("system");
  });
});

describe("applyTheme", () => {
  it("'dark' sempre adiciona a classe, independente do SO", () => {
    mockMatchMedia(false);
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("'light' sempre remove a classe, independente do SO", () => {
    mockMatchMedia(true);
    document.documentElement.classList.add("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("'system' segue a preferencia do SO quando escuro", () => {
    mockMatchMedia(true);
    applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("'system' segue a preferencia do SO quando claro", () => {
    mockMatchMedia(false);
    applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("setTheme", () => {
  it("persiste no localStorage e aplica a classe imediatamente", () => {
    mockMatchMedia(false);
    setTheme("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("watchSystemTheme", () => {
  it("chama o callback quando o SO muda e o tema salvo e 'system'", () => {
    const { fire } = mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    const onChange = vi.fn();
    watchSystemTheme(onChange);

    fire();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("nao chama o callback quando o tema salvo NAO e 'system'", () => {
    const { fire } = mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const onChange = vi.fn();
    watchSystemTheme(onChange);

    fire();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("a funcao de limpeza remove o listener", () => {
    const { fire } = mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    const onChange = vi.fn();
    const stopWatching = watchSystemTheme(onChange);

    stopWatching();
    fire();

    expect(onChange).not.toHaveBeenCalled();
  });
});
