"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
  // O token de verificacao e de uso unico (ver auth/service.py) — sem essa
  // guarda, o efeito duplo do React Strict Mode em desenvolvimento chamaria
  // /verify-email duas vezes, a segunda sempre falhando ("token ja usado")
  // e sobrescrevendo o sucesso real da primeira com um "Link invalido" falso.
  //
  // Importante: NAO combinar essa guarda com uma flag `cancelled` fechada
  // sobre a cleanup do efeito. O Strict Mode roda montagem->desmontagem->
  // remontagem uma vez em dev; a cleanup da PRIMEIRA invocacao dispara nesse
  // ciclo mesmo com firedRef ja true (que so bloqueia a SEGUNDA chamada de
  // rede). Se o `.then()`/`.catch()` daquela primeira chamada checassem uma
  // `cancelled` fechada nessa mesma cleanup, o unico request real (que
  // continua em voo) teria sua resposta 200 OK descartada silenciosamente —
  // a tela ficava presa em "Confirmando..." para sempre, mesmo com o backend
  // confirmando o e-mail com sucesso. firedRef sozinho ja garante uma unica
  // chamada; nao ha necessidade de um segundo mecanismo de cancelamento.
  const firedRef = useRef(false);
  const t = useTranslations("auth.confirmEmail");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!token || firedRef.current) return;
    firedRef.current = true;
    api
      .post("/api/v1/auth/verify-email", { token })
      .then(() => {
        setStatus("success");
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tCommon é estável entre renders (mesma instância do hook), incluí-la recriaria o efeito sem necessidade.
  }, [token]);

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

          {status === "loading" && (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                {t("loadingTitle")}
              </h1>
              <Skeleton className="mt-6 h-10 w-full" />
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                {t("successTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {t("successSubtitle")}
              </p>
              <Link
                href="/organizations"
                className={`${buttonPrimary} mt-6 inline-flex w-full justify-center py-2.5`}
              >
                {t("goToOrganizations")}
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 lg:mt-0 dark:text-slate-50">
                {t("errorTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {token ? (error ?? t("errorSubtitleWithToken")) : t("errorSubtitleWithoutToken")}
              </p>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {t("errorHintPrefix")}{" "}
                <Link href="/organizations" className={linkClass}>
                  {t("errorHintLink")}
                </Link>{" "}
                {t("errorHintSuffix")}
              </p>
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
