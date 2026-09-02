"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, input, label as labelClass, link as linkClass } from "@/lib/ui";
import { Alert } from "@/components/ui";
import { IconMail, IconUser } from "@/components/icons";
import { AuthHero } from "@/components/auth-hero";
import { BrandLogo } from "@/components/brand-logo";
import { PasswordInput } from "@/components/password-input";
import { PasswordRequirementsChecklist } from "@/components/password-requirements-checklist";

type RegisterResponse = { message: string; dev_token?: string };

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations("auth.register");
  const tCommon = useTranslations("common");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<RegisterResponse>("/api/v1/auth/register", {
        name,
        email,
        password,
      });
      setMessage(res.message);
      // Só adia o redirect quando há um dev_token pra mostrar (ambiente sem
      // provedor de e-mail configurado) — com e-mail de verdade enviado,
      // mantém a experiência original (vai direto pro login).
      if (res.dev_token) {
        setDevToken(res.dev_token);
      } else {
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1">
      <AuthHero
        eyebrow={t("heroEyebrow")}
        title={t("heroTitle")}
        description={t("heroDescription")}
      />

      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in-up">
          <BrandLogo
            variant="mark"
            priority
            className="mx-auto block h-auto w-auto max-w-[120px] object-contain sm:max-w-[150px] lg:hidden"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <label className={labelClass}>
              {t("nameLabel")}
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
              {t("emailLabel")}
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
              label={t("passwordLabel")}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={8}
            />
            <PasswordRequirementsChecklist password={password} />

            {error && <Alert>{error}</Alert>}
            {message && <Alert tone="success">{message}</Alert>}
            {devToken && (
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <p className="font-semibold">{t("devModeTitle")}</p>
                <Link
                  href={`/confirmar-email?token=${encodeURIComponent(devToken)}`}
                  className="mt-1 inline-block break-all underline"
                >
                  {t("devModeContinue")}
                </Link>
              </div>
            )}

            <button type="submit" disabled={submitting} className={`${buttonPrimary} mt-1 w-full py-2.5`}>
              {submitting ? t("submitting") : t("submit")}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            {t("hasAccountPrefix")}{" "}
            <Link href="/login" className={linkClass}>
              {t("signIn")}
            </Link>
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("learnMorePrefix")}{" "}
            <Link href="/sobre" className={linkClass}>
              {t("learnMoreLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
