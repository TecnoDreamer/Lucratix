"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { link as linkClass } from "@/lib/ui";
import { IconArrowLeft, IconUser } from "@/components/icons";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          <Link href="/organizations" className={`inline-flex items-center gap-1 text-sm ${linkClass}`}>
            <IconArrowLeft className="h-4 w-4" /> Suas empresas
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-600/30">
              <IconUser className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Conta
            </h1>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">{children}</div>
    </div>
  );
}
