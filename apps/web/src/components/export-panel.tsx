"use client";

import { useState } from "react";
import { ApiError, downloadFile } from "@/lib/api";
import { DATA_DOMAINS } from "@/lib/data-domains";
import { buttonPrimary, input as inputClass, label as labelClass, sectionTitle } from "@/lib/ui";
import { Alert, Card } from "@/components/ui";
import { IconDownload } from "@/components/icons";

type ExportFormat = "csv" | "xlsx" | "json";

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "csv", label: "CSV" },
  { id: "xlsx", label: "Excel (.xlsx)" },
  { id: "json", label: "JSON" },
];

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Seção sempre visível (inclusive para VIEWER) — exportar é leitura, mesmo
 * nível de permissão de GET /financials (ver ARCHITECTURE.md). */
export function ExportPanel({ organizationId }: { organizationId: string }) {
  const [domain, setDomain] = useState(DATA_DOMAINS[0].key);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [filterByDate, setFilterByDate] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    if (filterByDate && dateFrom && dateTo && dateFrom > dateTo) {
      setError("A data inicial não pode ser depois da data final.");
      return;
    }
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (filterByDate && dateFrom && dateTo) {
        params.set("date_from", dateFrom);
        params.set("date_to", dateTo);
      }
      const { blob, filename } = await downloadFile(
        `/api/v1/organizations/${organizationId}/exports/${domain}?${params.toString()}`
      );
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível exportar os dados.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <IconDownload className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Exportar dados</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Baixe os dados desta empresa em CSV, Excel ou JSON.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Dados</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Dados a exportar">
            {DATA_DOMAINS.map(({ key, label: domainLabel }) => (
              <button
                key={key}
                type="button"
                aria-pressed={domain === key}
                onClick={() => setDomain(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  domain === key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {domainLabel}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Formato</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Formato de exportação">
            {FORMATS.map(({ id, label: formatLabel }) => (
              <button
                key={id}
                type="button"
                aria-pressed={format === id}
                onClick={() => setFormat(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  format === id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {formatLabel}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={filterByDate}
            onChange={(e) => setFilterByDate(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
          />
          Filtrar por período (padrão: todos os períodos)
        </label>

        {filterByDate && (
          <div className="flex flex-wrap items-end gap-3">
            <label className={labelClass}>
              De
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`${inputClass} w-auto`}
              />
            </label>
            <label className={labelClass}>
              Até
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`${inputClass} w-auto`}
              />
            </label>
          </div>
        )}

        {error && <Alert>{error}</Alert>}

        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className={`${buttonPrimary} self-start`}
        >
          <IconDownload className="h-4 w-4" />
          {exporting ? "Exportando..." : "Exportar"}
        </button>
      </div>
    </Card>
  );
}
