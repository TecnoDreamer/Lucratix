"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, downloadFile } from "@/lib/api";
import { triggerBrowserDownload } from "@/lib/browser-download";
import { DATA_DOMAIN_KEYS, useDataDomains } from "@/lib/data-domains";
import { buttonPrimary, input as inputClass, label as labelClass, sectionTitle } from "@/lib/ui";
import { Alert, Card } from "@/components/ui";
import { IconDownload } from "@/components/icons";

type ExportFormat = "csv" | "xlsx" | "json";

// Rótulo dos formatos não precisa de tradução — "CSV"/"Excel (.xlsx)"/"JSON"
// são nomes próprios de formato de arquivo, iguais nos 3 idiomas.
const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "csv", label: "CSV" },
  { id: "xlsx", label: "Excel (.xlsx)" },
  { id: "json", label: "JSON" },
];

/** Seção sempre visível (inclusive para VIEWER) — exportar é leitura, mesmo
 * nível de permissão de GET /financials (ver ARCHITECTURE.md). */
export function ExportPanel({ organizationId }: { organizationId: string }) {
  const t = useTranslations("common.exportPanel");
  const dataDomains = useDataDomains();
  const [domain, setDomain] = useState(DATA_DOMAIN_KEYS[0].key);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [filterByDate, setFilterByDate] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportsDateRange = dataDomains.find((d) => d.key === domain)?.supportsDateRange ?? true;

  async function handleExport() {
    setError(null);
    if (supportsDateRange && filterByDate && dateFrom && dateTo && dateFrom > dateTo) {
      setError(t("invalidRange"));
      return;
    }
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (supportsDateRange && filterByDate && dateFrom && dateTo) {
        params.set("date_from", dateFrom);
        params.set("date_to", dateTo);
      }
      const { blob, filename } = await downloadFile(
        `/api/v1/organizations/${organizationId}/exports/${domain}?${params.toString()}`
      );
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <IconDownload className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("data")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={t("dataAriaLabel")}>
            {dataDomains.map(({ key, label: domainLabel }) => (
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
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("format")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={t("formatAriaLabel")}>
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

        {supportsDateRange && (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={filterByDate}
                onChange={(e) => setFilterByDate(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
              />
              {t("filterByDate")}
            </label>

            {filterByDate && (
              <div className="flex flex-wrap items-end gap-3">
                <label className={labelClass}>
                  {t("from")}
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={`${inputClass} w-auto`}
                  />
                </label>
                <label className={labelClass}>
                  {t("to")}
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={`${inputClass} w-auto`}
                  />
                </label>
              </div>
            )}
          </>
        )}

        {error && <Alert>{error}</Alert>}

        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className={`${buttonPrimary} self-start`}
        >
          <IconDownload className="h-4 w-4" />
          {exporting ? t("exporting") : t("export")}
        </button>
      </div>
    </Card>
  );
}
