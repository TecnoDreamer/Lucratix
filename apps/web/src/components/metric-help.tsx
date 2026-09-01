"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { getMetricById } from "@/domain/metrics/metric-utils";
import { IconHelpCircle } from "@/components/icons";

// Largura do painel em desktop/tablet (equivalente a `w-72`). Fixa porque a
// posicao e escrita direto no estilo do node (ver useLayoutEffect abaixo),
// nao mais via CSS `sm:absolute` — ver docs/design/Z_INDEX_LAYERS.md para o
// porque do Portal.
const PANEL_WIDTH = 288;
const VIEWPORT_MARGIN = 16;
const MOBILE_QUERY = "(max-width: 639px)"; // abaixo do breakpoint `sm` do Tailwind

/**
 * Ajuda contextual discreta para uma metrica/sigla — ver secao 4-7 do prompt
 * de UX. Funciona por hover (desktop), foco por teclado e clique/toque
 * (mobile), fecha com Escape ou clique fora. Conteudo vem sempre do catalogo
 * central (nunca duplicar texto de metrica em outro componente).
 *
 * O painel e renderizado via Portal em `document.body`: qualquer card que
 * contenha este componente (ex.: grid do dashboard) e um item de CSS Grid,
 * e passar o mouse no gatilho tambem aciona o `:hover` do card ancestral
 * (`hover:-translate-y-0.5`) — um `transform` cria um novo stacking context
 * que isola o `z-index` do painel dentro do proprio card, que por sua vez
 * perde para cards seguintes no grid (causa raiz documentada em
 * docs/auditoria/AUDITORIA_BI_RELATORIOS.md, secao 1). Aumentar o z-index
 * nao resolveria — o Portal tira o painel de qualquer stacking context local.
 */
export function MetricHelp({ metric }: { metric: string }) {
  const t = useTranslations("common.metricHelp");
  const definition = getMetricById(metric);
  const { id: organizationId } = useParams<{ id?: string }>();
  const panelId = useId();

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Suprime o onFocus enquanto devolvemos o foco ao gatilho programaticamente
  // (Escape) — sem isso, o .focus() abaixo dispara onFocus de volta e o
  // painel reabre sozinho logo depois de fechar.
  const suppressFocusOpen = useRef(false);

  const isOpen = hovered || focused || pinned;

  // Posiciona o painel escrevendo direto no estilo do node via ref — nunca
  // atraves de state do React. Isso mantem o calculo (que depende de medir o
  // DOM real, getBoundingClientRect/offsetHeight) fora do ciclo de render e
  // evita qualquer layout shift: roda em useLayoutEffect, antes da pintura,
  // e o painel ja nasce na posicao certa desde o primeiro frame visivel.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;

    function reposition() {
      if (window.matchMedia(MOBILE_QUERY).matches) {
        // Mobile usa o bottom-sheet fixo por CSS (classes abaixo) — remove
        // qualquer coordenada calculada anteriormente para nao competir com
        // a classe.
        panel!.style.removeProperty("top");
        panel!.style.removeProperty("left");
        return;
      }
      const rect = trigger!.getBoundingClientRect();
      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - PANEL_WIDTH / 2, VIEWPORT_MARGIN),
        window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN
      );
      let top = rect.bottom + 8;
      const panelHeight = panel!.offsetHeight;
      // Estoura a borda inferior da viewport: abre para cima do gatilho.
      if (panelHeight && top + panelHeight > window.innerHeight - VIEWPORT_MARGIN) {
        top = rect.top - panelHeight - 8;
      }
      panel!.style.top = `${top}px`;
      panel!.style.left = `${left}px`;
    }

    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setPinned(false);
      setHovered(false);
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

  const panelContent = (
    <div
      ref={panelRef}
      id={panelId}
      role="tooltip"
      className="fixed inset-x-4 bottom-4 z-50 animate-fade-in-up rounded-xl border border-slate-200 bg-white p-4 text-left shadow-lg sm:inset-x-auto sm:bottom-auto sm:w-72 dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        {definition.acronym ? `${definition.acronym} — ${definition.name}` : definition.name}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{definition.shortDescription}</p>
      <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {definition.direction === "lower_is_better" ? `↓ ${t("lowerIsBetter")}` : `↑ ${t("higherIsBetter")}`}
      </p>
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
          {t("seeFullExplanation")}
        </Link>
      )}
    </div>
  );

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("learnMoreAbout", { name: definition.name })}
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

      {isOpen && createPortal(panelContent, document.body)}
    </span>
  );
}
