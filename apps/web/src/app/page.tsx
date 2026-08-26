"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonPrimary } from "@/lib/ui";
import { IconAlertCircle } from "@/components/icons";
import { BrandLogo } from "@/components/brand-logo";
import type { User } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    setApiUnavailable(false);
    setRetryToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        await api.get<User>("/api/v1/auth/me");
        if (!cancelled) router.replace("/organizations");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(loginRedirectPath(err));
          return;
        }
        // Erro de rede (API fora do ar, CORS, etc.) — nao e um 401 de verdade,
        // entao nao redireciona as cegas para /login. Avisa o usuario em vez
        // de deixar o spinner girando pra sempre.
        setApiUnavailable(true);
      }
    }
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, [router, retryToken]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-blue-50 px-4 text-center dark:from-slate-950 dark:to-slate-900">
      {apiUnavailable ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-600/30 animate-scale-in">
          <IconAlertCircle className="h-7 w-7" />
        </div>
      ) : (
        <BrandLogo variant="wordmark" priority className="h-10 w-auto animate-scale-in" />
      )}
      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        {apiUnavailable ? (
          <>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Lucratix</h1>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Nao foi possivel conectar ao servidor. Verifique se a API esta rodando e tente de novo.
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Carregando seu ambiente...</p>
        )}
      </div>
      {apiUnavailable ? (
        <button onClick={retry} className={`${buttonPrimary} mt-1`}>
          Tentar novamente
        </button>
      ) : (
        <div className="mt-1 flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
        </div>
      )}
    </div>
  );
}
