"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { getMetricById } from "@/domain/metrics/metric-utils";
import { IconHelpCircle } from "@/components/icons";

/**
 * Ajuda contextual discreta para uma metrica/sigla — ver secao 4-7 do prompt
 * de UX. Funciona por hover (desktop), foco por teclado e clique/toque
 * (mobile), fecha com Escape ou clique fora. Conteudo vem sempre do catalogo
 * central (nunca duplicar texto de metrica em outro componente).
 */
export function MetricHelp({ metric }: { metric: string }) {
  const definition = getMetricById(metric);
  const { id: organizationId } = useParams<{ id?: string }>();
  const panelId = useId();

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Suprime o onFocus enquanto devolvemos o foco ao gatilho programaticamente
  // (Escape) — sem isso, o .focus() abaixo dispara onFocus de volta e o
  // painel reabre sozinho logo depois de fechar.
  const suppressFocusOpen = useRef(false);

  const isOpen = hovered || focused || pinned;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPinned(false);
        setHovered(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPinned(false);
        setHovered(false);
        setFocused(false);
        suppressFocusOpen.current = true;
        triggerRef.current?.focus();
        suppressFocusOpen.current = false;
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!definition) return null;

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Saiba mais sobre ${definition.name}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? panelId : undefined}
        onClick={() => setPinned((p) => !p)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => {
          if (suppressFocusOpen.current) return;
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-slate-500 dark:hover:text-blue-400"
      >
        <IconHelpCircle className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <span
          id={panelId}
          role="tooltip"
          className="fixed inset-x-4 bottom-4 z-50 animate-fade-in-up rounded-xl border border-slate-200 bg-white p-4 text-left shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-full sm:mt-2 sm:w-72 sm:-translate-x-1/2 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {definition.acronym ? `${definition.acronym} — ${definition.name}` : definition.name}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{definition.shortDescription}</p>
          {definition.formula && (
            <p className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {definition.formula}
            </p>
          )}
          {organizationId && (
            <Link
              href={`/organizations/${organizationId}/glossario?metric=${definition.id}`}
              className="mt-2 inline-block text-xs font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              onClick={() => setPinned(false)}
            >
              Ver explicação completa →
            </Link>
          )}
        </span>
      )}
    </span>
  );
}
