"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { link as linkClass } from "@/lib/ui";
import { Skeleton } from "@/components/ui";
import {
  IconArrowLeft,
  IconBuilding,
  IconDollar,
  IconFileText,
  IconFlask,
  IconFunnel,
  IconGrid,
  IconMegaphone,
  IconPackage,
  IconShieldCheck,
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
];

export default function OrganizationLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          router.push("/login");
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

  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
          <Link
            href="/organizations"
            className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <IconArrowLeft className="h-4 w-4" /> Suas empresas
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-600/30">
              <IconBuilding className="h-5 w-5" />
            </div>
            {loading ? (
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ) : (
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
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

          <nav className="mt-4 -mb-px flex gap-1 overflow-x-auto pb-px">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const target = `/organizations/${id}/${href}`;
              const active = pathname === target;
              return (
                <Link
                  key={href}
                  href={target}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
                  />
                  {label}
                  <span
                    className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-600 transition-opacity dark:bg-blue-400 ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">{children}</div>
    </div>
  );
}
