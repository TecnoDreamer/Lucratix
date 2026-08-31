"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { link as linkClass } from "@/lib/ui";
import { Skeleton } from "@/components/ui";
import { IconArrowLeft, IconBuilding, IconShieldCheck, IconUser } from "@/components/icons";
import type { User } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/admin/organizations", label: "Empresas", icon: IconBuilding },
  { href: "/admin/users", label: "Usuários", icon: IconUser },
];

/** Painel exclusivo de Super Admin (`is_platform_admin`) — RF-001, RF-012.
 * A autorização de verdade é sempre do backend (`require_platform_admin`,
 * cada rota de `/api/v1/platform/*` devolve 403 sem o papel); este layout só
 * evita renderizar o painel para quem não tem o papel, mesmo padrão de
 * `organizations/[id]/layout.tsx` (esconder um link/tela que terminaria em
 * 403, nunca a fonte de autorização). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<User>("/api/v1/auth/me")
      .then((user) => {
        if (cancelled) return;
        if (!user.is_platform_admin) {
          setDenied(true);
          router.replace("/organizations");
          return;
        }
        setMe(user);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
          return;
        }
        setDenied(true);
        router.replace("/organizations");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading || denied || !me) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="lg:flex lg:flex-1 lg:items-start">
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-slate-200 lg:bg-white lg:px-4 lg:py-5 dark:lg:border-slate-800 dark:lg:bg-slate-950">
        <Link
          href="/organizations"
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <IconArrowLeft className="h-4 w-4" /> Suas empresas
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-sm shadow-violet-600/30">
            <IconShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Painel Admin
            </h1>
            <p className="mt-0.5 inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              Super Admin
            </p>
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="lg:hidden">
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Painel Admin</span>
            <Link href="/organizations" className={`text-xs ${linkClass}`}>
              Sair do painel
            </Link>
          </div>
          <nav className="flex gap-1 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  pathname.startsWith(href)
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
