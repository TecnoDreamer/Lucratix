"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonPrimary } from "@/lib/ui";
import { IconAlertCircle, IconBuilding } from "@/components/icons";
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
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg animate-scale-in ${
          apiUnavailable
            ? "bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-600/30"
            : "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-600/30"
        }`}
      >
        {apiUnavailable ? (
          <IconAlertCircle className="h-7 w-7" />
        ) : (
          <IconBuilding className="h-7 w-7" />
        )}
      </div>
      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Marketing Analytics, Growth &amp; BI Platform
        </h1>
        {apiUnavailable ? (
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Nao foi possivel conectar ao servidor. Verifique se a API esta rodando e tente de novo.
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verificando sessão...</p>
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
