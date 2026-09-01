/** Idiomas suportados pela plataforma (i18n, 2026-09-01). Fonte única de
 * verdade — usada pelo `i18n/request.ts` (servidor), pelo seletor de
 * idioma e por `<LocaleSync />` (cliente). Sem prefixo de URL: o idioma
 * nunca aparece na rota, só no cookie abaixo (ver docs/adr/0009). */
export const LOCALES = ["pt-BR", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt-BR";

export function isLocale(value: string | null | undefined): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

// 1 ano, mesmo criterio de "preferencia de longa duracao" ja usado em
// outros cookies nao-sensiveis do projeto.
const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Só roda no cliente (usa `document.cookie` direto — não-httpOnly, não
 * precisa de Server Action/Route Handler pra escrever). Sempre com
 * `Path=/` e `SameSite=Lax` explícitos, sem depender do default do
 * navegador (mesmo cuidado já tomado com os cookies de sessão). */
export function setLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function getLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isLocale(value) ? value : null;
}

export const LOCALE_LABELS: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
  es: "Español",
};
