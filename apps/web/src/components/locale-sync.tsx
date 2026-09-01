"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getLocaleCookie, isLocale, setLocaleCookie } from "@/lib/locale";
import type { User } from "@/lib/types";

/** Sincroniza o idioma entre dispositivos: busca `GET /auth/me` uma vez ao
 * montar (mesmo papel de `<ThemeWatcher />`, sempre presente no layout
 * raiz — não remonta em navegação client-side, então dispara uma vez por
 * carregamento completo do app, não por página) e, se o idioma salvo no
 * backend divergir do cookie atual, atualiza o cookie e força os Server
 * Components a re-renderizar no idioma certo. Usuário anônimo → 401
 * silencioso, no-op (não é um erro, é esperado em página pública). */
export function LocaleSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api
      .get<User>("/api/v1/auth/me")
      .then((user) => {
        if (cancelled) return;
        if (isLocale(user.locale) && user.locale !== getLocaleCookie()) {
          setLocaleCookie(user.locale);
          router.refresh();
        }
      })
      .catch(() => {
        // Nao autenticado ou API fora do ar — sem idioma salvo pra
        // sincronizar, mantem o cookie (ou padrao) atual.
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
