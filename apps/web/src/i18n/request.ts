import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isLocale } from "@/lib/locale";

/** Sem roteamento i18n (sem `app/[locale]/`, sem proxy/middleware — ver
 * docs/adr/0009-estrategia-i18n.md): o idioma nunca vem da URL, só do
 * cookie `NEXT_LOCALE`, lido aqui a cada request no servidor. Sem cookie
 * (primeira visita, ou aba anônima) cai no padrão pt-BR — sem
 * auto-detecção por `Accept-Language`, de propósito (previsível; o
 * seletor em Configurações é fácil de achar). */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
