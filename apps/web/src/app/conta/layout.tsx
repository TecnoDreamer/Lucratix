"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { link as linkClass } from "@/lib/ui";
import { IconArrowLeft, IconUser } from "@/components/icons";
import { AccountProvider } from "@/contexts/account-context";
import { accountBackTarget, resolveActiveOrganization } from "@/lib/active-organization";
import type { Organization, OrganizationPage } from "@/lib/types";

export default function AccountLayout({ children }: { children: ReactNode }) {
  // `useSearchParams` exige um limite de Suspense em build de producao
  // (mesmo padrao de login/page.tsx, redefinir-senha/page.tsx, etc.).
  return (
    <Suspense>
      <AccountLayoutInner>{children}</AccountLayoutInner>
    </Suspense>
  );
}

function AccountLayoutInner({ children }: { children: ReactNode }) {
  const t = useTranslations("account.layout");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // status=all + limit=100: GET /organizations agora pagina por padrão
    // (24 por página). resolveActiveOrganization precisa da lista real do
    // usuário pra validar `?from`/localStorage (nunca confiar num id cru —
    // ver active-organization.ts), então busca até 100 de uma vez. Acima
    // disso, degrada com segurança pro fallback "Suas empresas" — sem
    // vazamento, só um "Voltar" menos preciso pra quem tem muitas empresas.
    api
      .get<OrganizationPage>("/api/v1/organizations?status=all&limit=100")
      .then((page) => {
        if (!cancelled) setOrganizations(page.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Sessao expirada ou sem organizacoes: NAO redireciona daqui — a
        // lista fica vazia, o "Voltar" degrada sozinho para "Suas empresas"
        // (accountBackTarget abaixo), que por sua vez ja redireciona pro
        // login se for o caso. Evita duas navegacoes concorrentes para a
        // mesma falha.
        setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // tCommon (tradutor) omitido de propósito: nunca é referencialmente
    // estável entre renders — ver nota em organizations/page.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeOrganization = useMemo(
    () => resolveActiveOrganization(organizations, fromParam),
    [organizations, fromParam]
  );

  // Enquanto carrega, mostra o fallback (nunca um spinner no lugar do link:
  // um "Voltar" clicavel desde o primeiro instante, mesmo que aponte pro
  // alvo generico por 200ms, e melhor que uma label que so aparece depois).
  // accountBackTarget (lib/active-organization.ts) é puro/testado em pt-BR
  // (ver active-organization.spec.ts) — usamos só o `.href` daqui, o rótulo
  // é montado traduzido, sem alterar a função nem o teste existente.
  const backTarget = loading
    ? { href: "/organizations" }
    : accountBackTarget(activeOrganization);
  const backLabel =
    !loading && activeOrganization ? t("backTo", { name: activeOrganization.name }) : t("yourCompanies");

  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          <Link
            href={backTarget.href}
            className={`inline-flex items-center gap-1 text-sm ${linkClass}`}
          >
            <IconArrowLeft className="h-4 w-4 shrink-0" />
            <span className="max-w-[18rem] truncate">{backLabel}</span>
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-600/30">
              <IconUser className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {t("title")}
            </h1>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <AccountProvider value={{ organizations, activeOrganization, loading, error }}>
          {children}
        </AccountProvider>
      </div>
    </div>
  );
}
