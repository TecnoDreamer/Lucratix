"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { IconBuilding } from "@/components/icons";
import type { User } from "@/lib/types";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      try {
        await api.get<User>("/api/v1/auth/me");
        router.replace("/organizations");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        // API indisponivel: mantem o usuario nesta pagina em vez de redirecionar as cegas.
      }
    }
    void checkSession();
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-blue-50 px-4 text-center dark:from-slate-950 dark:to-slate-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/30 animate-scale-in">
        <IconBuilding className="h-7 w-7" />
      </div>
      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Marketing Analytics, Growth &amp; BI Platform
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verificando sessão...</p>
      </div>
      <div className="mt-1 flex gap-1.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
      </div>
    </div>
  );
}
