"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth.resetPassword");
  const tCommon = useTranslations("common");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
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

          {!token ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                {t("invalidLinkTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {t("invalidLinkSubtitle")}
              </p>
              <Link
                href="/esqueci-senha"
                className={`mt-6 inline-block text-sm ${linkClass}`}
              >
                {t("requestNewLink")}
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                {t("doneTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("doneSubtitle")}</p>
              <Link href="/login" className={`${buttonPrimary} mt-6 inline-flex w-full justify-center py-2.5`}>
                {t("goToLogin")}
              </Link>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                {t("title")}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>

              <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
                <PasswordInput
                  label={t("newPasswordLabel")}
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  minLength={8}
                  autoFocus
                />
                <PasswordInput
                  label={t("confirmPasswordLabel")}
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
                  {submitting ? t("submitting") : t("submit")}
                </button>
              </form>
            </>
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
