"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme, watchSystemTheme } from "@/lib/theme";

/** Reaplica o tema se o usuario tiver "Sistema" selecionado e o SO mudar de
 * claro/escuro enquanto o app esta aberto. Sem UI propria. */
export function ThemeWatcher() {
  useEffect(() => watchSystemTheme(() => applyTheme(getStoredTheme())), []);

  // Relatórios impressos/PDF sempre em tema claro — texto claro (dark:text-*)
  // some no papel porque navegadores nao imprimem `background-color` por
  // padrao, mas imprimem `color`. Cobre Ctrl+P direto, nao so um botao
  // dedicado (ver docs/adr/0007-relatorios-html-print-css.md).
  useEffect(() => {
    function forceLightForPrint() {
      document.documentElement.classList.remove("dark");
    }
    function restoreTheme() {
      applyTheme(getStoredTheme());
    }
    window.addEventListener("beforeprint", forceLightForPrint);
    window.addEventListener("afterprint", restoreTheme);
    return () => {
      window.removeEventListener("beforeprint", forceLightForPrint);
      window.removeEventListener("afterprint", restoreTheme);
    };
  }, []);

  return null;
}
