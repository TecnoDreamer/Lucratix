"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, link as linkClass } from "@/lib/ui";
import { Alert } from "@/components/ui";
import { AuthHero } from "@/components/auth-hero";
import { BrandLogo } from "@/components/brand-logo";
import { PasswordInput } from "@/components/password-input";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/v1/auth/password-reset/confirm", {
        token,
        new_password: newPassword,
      });
      setDone(true);
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
        title="Escolha uma nova senha para continuar."
        description="Use uma senha forte e exclusiva para a Lucratix — nunca reaproveite senhas de outros serviços."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <BrandLogo variant="wordmark" priority className="mx-auto block h-16 w-auto lg:hidden" />

          {!token ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                Link inválido
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Este link de redefinição está incompleto ou já foi usado.
              </p>
              <Link
                href="/esqueci-senha"
                className={`mt-6 inline-block text-sm ${linkClass}`}
              >
                Solicitar um novo link →
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                Senha alterada com sucesso
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Sua senha foi redefinida. Entre novamente para continuar.
              </p>
              <Link href="/login" className={`${buttonPrimary} mt-6 inline-flex w-full justify-center py-2.5`}>
                Ir para o login
              </Link>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                Nova senha
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Escolha uma nova senha para sua conta.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
                <PasswordInput
                  label="Nova senha"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  minLength={8}
                  autoFocus
                />
                <PasswordInput
                  label="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  minLength={8}
                />

                {error && <Alert>{error}</Alert>}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`${buttonPrimary} mt-1 w-full py-2.5`}
                >
                  {submitting ? "Salvando..." : "Redefinir senha"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
