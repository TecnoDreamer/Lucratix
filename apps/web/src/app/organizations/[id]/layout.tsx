"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { link as linkClass } from "@/lib/ui";
import { Skeleton } from "@/components/ui";
import {
  IconArrowLeft,
  IconBookOpen,
  IconBuilding,
  IconDollar,
  IconFileText,
  IconFlask,
  IconFunnel,
  IconGrid,
  IconMegaphone,
  IconMenu,
  IconPackage,
  IconSettings,
  IconShieldCheck,
  IconX,
} from "@/components/icons";
import type { Organization } from "@/lib/types";

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard", icon: IconGrid },
  { href: "products", label: "Produtos", icon: IconPackage },
  { href: "financials", label: "Financeiro", icon: IconDollar },
  { href: "marketing", label: "Marketing", icon: IconMegaphone },
  { href: "funnel", label: "Funil", icon: IconFunnel },
  { href: "experiments", label: "Experimentos", icon: IconFlask },
  { href: "reports", label: "Relatório", icon: IconFileText },
  { href: "audit", label: "Auditoria", icon: IconShieldCheck },
  { href: "glossario", label: "Glossário", icon: IconBookOpen },
];

export default function OrganizationLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setLoadError(null);
      }
    });
    api
      .get<Organization>(`/api/v1/organizations/${id}`)
      .then((org) => {
        if (!cancelled) setOrganization(org);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setLoadError("Empresa nao encontrada ou voce nao tem acesso a ela.");
          return;
        }
        setLoadError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // Fecha o drawer mobile automaticamente ao navegar para uma nova rota.
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setMobileNavOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm text-rose-600 dark:text-rose-400">{loadError}</p>
        <Link href="/organizations" className={`mt-4 inline-flex items-center gap-1 text-sm ${linkClass}`}>
          <IconArrowLeft className="h-4 w-4" /> Suas empresas
        </Link>
      </div>
    );
  }

  const sidebarContent = (
    <>
      <Link
        href="/organizations"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
      >
        <IconArrowLeft className="h-4 w-4" /> Suas empresas
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-600/30">
          <IconBuilding className="h-5 w-5" />
        </div>
        {loading ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ) : (
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {organization?.name}
            </h1>
            {organization?.my_role && (
              <p className="mt-0.5 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                Seu papel: {organization.my_role}
              </p>
            )}
          </div>
        )}
      </div>

      <nav className="mt-6 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const target = `/organizations/${id}/${href}`;
          const active = pathname === target;
          return (
            <Link
              key={href}
              href={target}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
          Conta
        </p>
        <nav className="mt-2 flex flex-col gap-0.5">
          <Link
            href="/conta/configuracoes"
            className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <IconSettings className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            Configurações
          </Link>
        </nav>
      </div>
    </>
  );

  return (
    <div className="lg:flex lg:flex-1 lg:items-start">
      {/* Sidebar fixa — desktop (lg: e acima) */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-slate-200 lg:bg-white lg:px-4 lg:py-5 dark:lg:border-slate-800 dark:lg:bg-slate-950">
        {sidebarContent}
      </aside>

      {/* Topbar + drawer — mobile/tablet (abaixo de lg) */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {loading ? "Carregando..." : organization?.name}
          </span>
        </header>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-30">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navegação"
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-white px-4 py-5 shadow-xl dark:bg-slate-950"
            >
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Fechar menu"
                className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <IconX className="h-5 w-5" />
              </button>
              {sidebarContent}
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
