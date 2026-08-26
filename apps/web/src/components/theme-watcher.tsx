"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme, watchSystemTheme } from "@/lib/theme";

/** Reaplica o tema se o usuario tiver "Sistema" selecionado e o SO mudar de
 * claro/escuro enquanto o app esta aberto. Sem UI propria. */
export function ThemeWatcher() {
  useEffect(() => watchSystemTheme(() => applyTheme(getStoredTheme())), []);
  return null;
}
