"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, input, label as labelClass, link as linkClass } from "@/lib/ui";
import { Alert } from "@/components/ui";
import { IconMail, IconUser } from "@/components/icons";
import { AuthHero } from "@/components/auth-hero";
import { BrandLogo } from "@/components/brand-logo";
import { PasswordInput } from "@/components/password-input";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>("/api/v1/auth/register", {
        name,
        email,
        password,
      });
      setMessage(res.message);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1">
      <AuthHero
        eyebrow="Comece agora"
        title="Substitua planilhas soltas por uma visão só, atualizada e confiável."
        description="Cadastre a primeira empresa em segundos e comece a registrar baselines, campanhas e resultados hoje mesmo."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <BrandLogo
            variant="mark"
            priority
            className="mx-auto block h-auto w-auto max-w-[120px] object-contain sm:max-w-[150px] lg:hidden"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
            Criar conta na Lucratix
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Comece a transformar dados em decisões em poucos minutos.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <label className={labelClass}>
              Nome
              <span className="relative">
                <IconUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  autoFocus
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${input} pl-9`}
                />
              </span>
            </label>
            <label className={labelClass}>
              E-mail
              <span className="relative">
                <IconMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${input} pl-9`}
                />
              </span>
            </label>
            <PasswordInput
              label="Senha"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={8}
            />

            {error && <Alert>{error}</Alert>}
            {message && <Alert tone="success">{message}</Alert>}

            <button type="submit" disabled={submitting} className={`${buttonPrimary} mt-1 w-full py-2.5`}>
              {submitting ? "Enviando..." : "Cadastrar"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Ja tem conta?{" "}
            <Link href="/login" className={linkClass}>
              Entrar
            </Link>
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Quer entender melhor antes de cadastrar?{" "}
            <Link href="/sobre" className={linkClass}>
              Conheça a aplicação
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
