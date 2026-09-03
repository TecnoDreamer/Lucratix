"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, downloadFile } from "@/lib/api";
import { triggerBrowserDownload } from "@/lib/browser-download";
import { buttonSecondary } from "@/lib/ui";
import { Alert } from "@/components/ui";
import { IconFileText } from "@/components/icons";

/** Botão reutilizável para relatório em PDF gerado no servidor (RF do
 * prompt de funil/gráficos/PDF, "padrão reutilizável de relatório em
 * PDF") — reaproveita `downloadFile`/`triggerBrowserDownload`, os mesmos
 * já usados por `export-panel.tsx`, sem nenhuma mudança neles. Só recebe
 * o caminho do endpoint e um rótulo: qualquer relatório futuro (a PR4
 * inventaria onde mais faz sentido) usa este mesmo componente. */
export function GeneratePdfReportButton({ path, label }: { path: string; label: string }) {
  const t = useTranslations("common.generatePdfReportButton");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const { blob, filename } = await downloadFile(path);
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={generating}
        className={buttonSecondary}
      >
        <IconFileText className="h-4 w-4" />
        {generating ? t("generating") : label}
      </button>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
