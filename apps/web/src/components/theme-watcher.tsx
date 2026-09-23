"use client";

import { useEffect, useLayoutEffect } from "react";
import { applyTheme, getStoredTheme, watchSystemTheme } from "@/lib/theme";

/** Reaplica o tema se o usuario tiver "Sistema" selecionado e o SO mudar de
 * claro/escuro enquanto o app esta aberto. Sem UI propria. */
export function ThemeWatcher() {
  // Reaplica o tema logo no mount — não por causa de hidratação (o script
  // inline em `layout.tsx` + `suppressHydrationWarning` no `<html>` já
  // cobrem isso), mas porque o Strict Mode do React, só em desenvolvimento,
  // remonta o `<html>` uma vez pra achar bugs e nesse remount reseta os
  // atributos pro que está na JSX, apagando a classe "dark" que o script
  // tinha aplicado — comportamento documentado pelo próprio Next.js
  // (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md,
  // seção "Re-applying attributes in development"; era a causa real do
  // erro de hidratação no tema escuro que a auditoria de acessibilidade
  // encontrou e o `suppressHydrationWarning` sozinho não resolvia). No-op
  // em produção (Strict Mode só remonta em dev). `useLayoutEffect`, não
  // `useEffect`, pra rodar antes da pintura — sem o usuário ver o flash de
  // volta pro tema claro entre o remount e a reaplicação.
  useLayoutEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

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
