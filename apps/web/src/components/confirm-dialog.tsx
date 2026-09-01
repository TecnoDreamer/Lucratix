"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { buttonDanger, buttonPrimary, buttonSecondary } from "@/lib/ui";
import { Alert } from "@/components/ui";

// Nenhum modal reaproveitável existia no projeto antes desta feature — o
// único `role="dialog"` do app é o drawer de navegação mobile, hand-rolled
// dentro de organizations/[id]/layout.tsx, sem semântica de
// confirmar/cancelar. Este componente segue a mesma estrutura (backdrop +
// painel), generalizada para qualquer ação que precise de confirmação
// (ex.: encerrar uma empresa).
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "default",
  confirming = false,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  confirming?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const t = useTranslations("common");
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const resolvedCancelLabel = cancelLabel ?? t("cancel");

  useEffect(() => {
    if (!open) return;
    // Foco no botão de cancelar por padrão — mais seguro antes de uma ação
    // potencialmente destrutiva do que focar automaticamente em "confirmar".
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

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
        >
          <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
          {children && <div className="mt-4">{children}</div>}
          {error && (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onCancel}
              disabled={confirming}
              className={buttonSecondary}
            >
              {resolvedCancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirming}
              className={tone === "danger" ? buttonDanger : buttonPrimary}
            >
              {confirming ? t("pleaseWait") : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
