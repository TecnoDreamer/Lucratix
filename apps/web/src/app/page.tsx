"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
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
    <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-zinc-50 px-4 text-center dark:bg-black">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Marketing Analytics, Growth &amp; BI Platform
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Verificando sessao...</p>
    </div>
  );
}
