"use client";

import { useEffect, useState } from "react";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { card, sectionTitle } from "@/lib/ui";
import { IconMonitor, IconMoon, IconSettings, IconSun } from "@/components/icons";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof IconSun }[] = [
  { value: "system", label: "Sistema", icon: IconMonitor },
  { value: "light", label: "Claro", icon: IconSun },
  { value: "dark", label: "Escuro", icon: IconMoon },
];

export default function AccountSettingsPage() {
  // Comeca em "system" (mesmo valor que o servidor assume) e so le o real
  // valor salvo apos montar no cliente, para nao gerar erro de hidratacao —
  // localStorage nao existe durante o SSR.
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setThemeState(getStoredTheme());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelect(value: Theme) {
    setThemeState(value);
    setTheme(value);
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconSettings className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Configurações</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Preferências da sua conta, aplicadas em todas as empresas que você acessa.
      </p>

      <div className={`${card} mt-6 p-5`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Aparência</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Escolha como o tema claro/escuro se comporta neste dispositivo.
        </p>

        <div role="radiogroup" aria-label="Tema" className="mt-4 grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors ${
                  selected
                    ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
