"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { buttonGhost, buttonPrimary, buttonSecondary } from "@/lib/ui";
import { SegmentedControl } from "@/components/segmented-control";
import { IconRotateCcw } from "@/components/icons";
import { CHART_PRESETS, type ChartPreset } from "@/lib/chart-settings";

/** Modal de personalização de gráfico (redesign do Funil, PR2) — mesma
 * estrutura de `components/confirm-dialog.tsx` (backdrop, foco, Escape,
 * trava de scroll: seção 21 do prompt de redesign pede pra não inventar um
 * padrão de modal novo). Não sabe nada de nenhum gráfico específico — os
 * controles de cada um (quais opções fazem sentido pra ele, seção 9 do
 * prompt: "matriz de compatibilidade") entram via `children`, já
 * refletindo o rascunho atual (o gráfico por trás do dialog também
 * renderiza a partir desse mesmo rascunho — é o "preview ao vivo" da
 * seção 11, não uma miniatura separada). */
export function ChartSettingsDialog({
  open,
  title,
  preset,
  onPresetChange,
  onApply,
  onCancel,
  onReset,
  children,
}: {
  open: boolean;
  title: string;
  preset: ChartPreset;
  onPresetChange: (preset: ChartPreset) => void;
  onApply: () => void;
  onCancel: () => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("charts");
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const presetOptions = CHART_PRESETS.map((value) => ({ value, label: t(`presets.${value}`) }));

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={onCancel} aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
        >
          <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("settings.preset")}
            </p>
            <SegmentedControl value={preset} onChange={onPresetChange} options={presetOptions} ariaLabel={t("settings.preset")} />
          </div>

          <div className="mt-4 flex flex-col gap-3">{children}</div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button type="button" onClick={onReset} className={buttonGhost}>
              <IconRotateCcw className="h-4 w-4" />
              {t("actions.reset")}
            </button>
            <div className="flex gap-2">
              <button ref={cancelButtonRef} type="button" onClick={onCancel} className={buttonSecondary}>
                {t("actions.cancel")}
              </button>
              <button type="button" onClick={onApply} className={buttonPrimary}>
                {t("actions.apply")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
