"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, input, label as labelClass, link as linkClass } from "@/lib/ui";
import { Alert } from "@/components/ui";
import { IconMail } from "@/components/icons";
import { AuthHero } from "@/components/auth-hero";
import { BrandLogo } from "@/components/brand-logo";

type ResetRequestResponse = { message: string; dev_token?: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ResetRequestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<ResetRequestResponse>("/api/v1/auth/password-reset/request", {
        email,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1">
      <AuthHero
        eyebrow="Recuperação de acesso"
        title="Acontece. Vamos recuperar o acesso à sua conta."
        description="Informe o e-mail cadastrado e enviamos um link seguro para você escolher uma nova senha."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <BrandLogo variant="wordmark" priority className="mx-auto block h-16 w-auto lg:hidden" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
            Esqueceu sua senha?
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Informe seu e-mail para receber um link de redefinição.
          </p>

          {result ? (
            <div className="mt-7 flex flex-col gap-4">
              <Alert tone="success">{result.message}</Alert>
              {result.dev_token && (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <p className="font-semibold">Modo desenvolvimento — sem envio de e-mail configurado</p>
                  <Link
                    href={`/redefinir-senha?token=${encodeURIComponent(result.dev_token)}`}
                    className="mt-1 inline-block break-all underline"
                  >
                    Continuar para redefinir a senha →
                  </Link>
                </div>
              )}
              <Link href="/login" className={`text-sm ${linkClass}`}>
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
              <label className={labelClass}>
                E-mail
                <span className="relative">
                  <IconMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${input} pl-9`}
                  />
                </span>
              </label>

              {error && <Alert>{error}</Alert>}

              <button type="submit" disabled={submitting} className={`${buttonPrimary} mt-1 w-full py-2.5`}>
                {submitting ? "Enviando..." : "Enviar link de redefinição"}
              </button>

              <Link href="/login" className={`text-center text-sm ${linkClass}`}>
                Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
