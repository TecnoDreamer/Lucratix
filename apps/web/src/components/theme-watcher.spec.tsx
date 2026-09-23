import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { ThemeWatcher } from "./theme-watcher";

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("dark") ? prefersDark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ThemeWatcher", () => {
  it("no mount, reaplica o tema salvo mesmo com a classe 'dark' já removida do <html>", () => {
    // Simula o Strict Mode do React (só em dev) remontando <html> e
    // resetando pros atributos da JSX, apagando a classe que o script
    // inline de layout.tsx tinha aplicado antes da hidratação — era a
    // causa real do erro de hidratação no tema escuro que
    // `suppressHydrationWarning` sozinho não resolvia (ver comentário do
    // componente). Sem essa reaplicação no mount, o tema escuro salvo
    // ficaria "perdido" até o próximo evento de mudança de tema do SO.
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    render(<ThemeWatcher />);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("no mount, tema 'light' salvo não adiciona a classe 'dark'", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(<ThemeWatcher />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("sem nada salvo (padrão 'system'), segue a preferência do SO no mount", () => {
    mockMatchMedia(true);
    render(<ThemeWatcher />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("não renderiza nenhum elemento (sem UI própria)", () => {
    const { container } = render(<ThemeWatcher />);
    expect(container).toBeEmptyDOMElement();
  });
});
