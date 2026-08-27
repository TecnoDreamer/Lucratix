import Link from "next/link";
import { cardHover } from "@/lib/ui";
import { IconChevronRight } from "@/components/icons";
import type { ComponentType, SVGProps } from "react";

// Atalho da seção "Acesso rápido" da página inicial da empresa — PARTE 4 do
// prompt de redesign de UX (2026-08-27). Sempre aponta para uma rota já
// existente (nenhuma rota nova foi criada para isso).
export function QuickAccessCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className={`${cardHover} group flex items-start gap-3 p-4`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      <IconChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
    </Link>
  );
}
