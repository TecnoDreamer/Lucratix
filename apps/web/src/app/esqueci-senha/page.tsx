"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth.forgotPassword");
  const tCommon = useTranslations("common");

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

          {result ? (
            <div className="mt-7 flex flex-col gap-4">
              <Alert tone="success">{result.message}</Alert>
              {result.dev_token && (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <p className="font-semibold">{t("devModeTitle")}</p>
                  <Link
                    href={`/redefinir-senha?token=${encodeURIComponent(result.dev_token)}`}
                    className="mt-1 inline-block break-all underline"
                  >
                    {t("devModeContinue")}
                  </Link>
                </div>
              )}
              <Link href="/login" className={`text-sm ${linkClass}`}>
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
              <label className={labelClass}>
                {t("emailLabel")}
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
                {submitting ? t("submitting") : t("submit")}
              </button>

              <Link href="/login" className={`text-center text-sm ${linkClass}`}>
                {t("backToLogin")}
              </Link>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
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
