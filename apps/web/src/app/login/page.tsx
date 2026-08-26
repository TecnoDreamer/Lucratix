"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { api, ApiError, SESSION_REVOKED_MESSAGE } from "@/lib/api";
import { buttonPrimary, input, label as labelClass, link as linkClass } from "@/lib/ui";
import { Alert } from "@/components/ui";
import { IconLock, IconMail, IconShieldCheck } from "@/components/icons";
import { AuthHero } from "@/components/auth-hero";
import type { User } from "@/lib/types";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionRevoked = searchParams.get("reason") === "session_revoked";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<User>("/api/v1/auth/login", { email, password });
      router.push("/organizations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1">
      <AuthHero
        eyebrow="Bem-vindo de volta"
        title="Seus clientes. Seus números. Uma única visão."
        description="Baselines, funil, campanhas e experimentos de CRO — organizados por empresa, prontos para orientar a próxima decisão."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Entrar
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Marketing Analytics, Growth &amp; BI Platform
          </p>

          {sessionRevoked && !error && (
            <div className="mt-5">
              <Alert>{SESSION_REVOKED_MESSAGE} Entre novamente para continuar.</Alert>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`mt-7 flex flex-col gap-4 ${shake ? "animate-[shake_0.4s]" : ""}`}
          >
            <label className={labelClass}>
              E-mail
              <span className="relative">
                <IconMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${input} pl-9`}
                />
              </span>
            </label>
            <label className={labelClass}>
              Senha
              <span className="relative">
                <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${input} pl-9`}
                />
              </span>
            </label>

            {error && <Alert>{error}</Alert>}

            <button type="submit" disabled={submitting} className={`${buttonPrimary} mt-1 w-full py-2.5`}>
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <IconShieldCheck className="h-3.5 w-3.5" />
            Sua sessão fica protegida e você continua conectado com segurança.
          </p>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Ainda nao tem conta?{" "}
            <Link href="/register" className={linkClass}>
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
