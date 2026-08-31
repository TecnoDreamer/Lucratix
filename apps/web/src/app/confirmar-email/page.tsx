"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, link as linkClass } from "@/lib/ui";
import { Skeleton } from "@/components/ui";
import { AuthHero } from "@/components/auth-hero";
import { BrandLogo } from "@/components/brand-logo";

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmEmailContent />
    </Suspense>
  );
}

type Status = "loading" | "success" | "error";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .post("/api/v1/auth/verify-email", { token })
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Não foi possível conectar à API.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex flex-1">
      <AuthHero
        eyebrow="Confirmação de e-mail"
        title="Confirmando o seu acesso à Lucratix."
        description="Isso garante que só você consegue usar a conta cadastrada com este e-mail."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <BrandLogo
            variant="mark"
            priority
            className="mx-auto block h-auto w-auto max-w-[120px] object-contain sm:max-w-[150px] lg:hidden"
          />

          {status === "loading" && (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                Confirmando...
              </h1>
              <Skeleton className="mt-6 h-10 w-full" />
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                E-mail confirmado
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Seu e-mail foi verificado com sucesso.
              </p>
              <Link
                href="/organizations"
                className={`${buttonPrimary} mt-6 inline-flex w-full justify-center py-2.5`}
              >
                Ir para Suas empresas
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                Link inválido
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {token
                  ? (error ?? "Este link de confirmação está incompleto, expirado ou já foi usado.")
                  : "Este link de confirmação está incompleto ou já foi usado."}
              </p>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Você pode pedir um novo e-mail de confirmação a partir de{" "}
                <Link href="/organizations" className={linkClass}>
                  Suas empresas
                </Link>{" "}
                depois de entrar.
              </p>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Ainda não conhece a Lucratix?{" "}
            <Link href="/sobre" className={linkClass}>
              Conheça a aplicação
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
