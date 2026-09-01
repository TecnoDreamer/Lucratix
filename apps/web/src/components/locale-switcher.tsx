"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { LOCALES, LOCALE_LABELS, setLocaleCookie, type Locale } from "@/lib/locale";
import { card } from "@/lib/ui";
import { IconGlobe } from "@/components/icons";

/** Seção "Idioma" da Central de Configurações — mesmo padrão visual de
 * "Aparência" (radiogroup de opções com ícone). Ao trocar: grava o cookie
 * na hora (leitura imediata pelo servidor), tenta persistir no backend
 * (falha silenciosa — mesma categoria de preferência não-crítica de
 * workspace-preferences) e força os Server Components a re-renderizar já
 * no novo idioma via `router.refresh()`, sem reload de página inteira. */
export function LocaleSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale() as Locale;
  const t = useTranslations("account.language");
  const [pending, setPending] = useState<Locale | null>(null);

  function handleSelect(locale: Locale) {
    if (locale === currentLocale) return;
    setPending(locale);
    setLocaleCookie(locale);
    void api.patch("/api/v1/auth/locale", { locale }).catch(() => {
      // Best-effort: o cookie já foi gravado, a troca funciona nesta aba
      // mesmo que a sincronia entre dispositivos falhe agora.
    });
    router.refresh();
  }

  return (
    <div className={`${card} mt-6 p-5`}>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("title")}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      <div role="radiogroup" aria-label={t("title")} className="mt-4 grid grid-cols-3 gap-3">
        {LOCALES.map((locale) => {
          const selected = currentLocale === locale;
          return (
            <button
              key={locale}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending !== null && pending !== locale}
              onClick={() => handleSelect(locale)}
              className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors disabled:opacity-50 ${
                selected
                  ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              }`}
            >
              <IconGlobe className="h-5 w-5" />
              {LOCALE_LABELS[locale]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
