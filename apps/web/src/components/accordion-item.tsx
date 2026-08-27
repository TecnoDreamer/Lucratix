"use client";

import { useId, useState, type ReactNode } from "react";
import { card } from "@/lib/ui";
import { IconChevronDown } from "@/components/icons";

// Mesmo padrão de acordeão de organizations/[id]/glossario/page.tsx (botão +
// aria-expanded/aria-controls + chevron rotacionando), extraído aqui para
// reuso nas seções de Glossário e FAQ da página pública /sobre. Estado local
// por item (não um Set compartilhado) porque aqui não há deep-link nem
// destaque cruzado entre itens — cada card é independente.
export function AccordionItem({
  title,
  subtitle,
  defaultExpanded = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();

  return (
    <div className={`${card} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</span>
          {subtitle && (
            <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
          )}
        </span>
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div
          id={panelId}
          className="border-t border-slate-100 px-4 py-3.5 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300"
        >
          {children}
        </div>
      )}
    </div>
  );
}
