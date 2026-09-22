"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { useDataDomains } from "@/lib/data-domains";
import { buttonPrimary, buttonSecondary, select as selectClass, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Badge, Card } from "@/components/ui";
import { IconUpload } from "@/components/icons";
import { ScrollableCard } from "@/components/scrollable-card";

type Step = "upload" | "sheet" | "mapping" | "preview" | "done";
type DuplicateStrategy = "skip" | "update";
type DateFormat = "DMY" | "MDY" | "ISO";

interface DomainField {
  canonical_name: string;
  display_name: string;
  data_type: string;
  required: boolean;
}

interface MappingSuggestion {
  header: string;
  canonical_field: string | null;
  confidence: "alta" | "media" | "baixa" | "sem_correspondencia";
  display_name: string | null;
}

interface ImportJob {
  id: string;
  source_filename: string;
  sheet_name: string | null;
  status: string;
  total_rows: number | null;
}

interface ImportJobCreateResponse {
  job: ImportJob;
  suggested_mapping: MappingSuggestion[];
  domain_fields: DomainField[];
}

interface XlsxSheetSelectionRequired {
  needs_sheet_selection: true;
  sheets: string[];
}

type ImportUploadResponse = ImportJobCreateResponse | XlsxSheetSelectionRequired;

function needsSheetSelection(response: ImportUploadResponse): response is XlsxSheetSelectionRequired {
  return "needs_sheet_selection" in response && response.needs_sheet_selection === true;
}

interface ValidationSummary {
  status: string;
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
}

interface PreviewError {
  field: string | null;
  message: string;
  raw_value: string | null;
}

interface PreviewRow {
  row_number: number;
  transformed: Record<string, unknown>;
  status: "valid" | "invalid" | "duplicate";
  errors: PreviewError[];
}

interface PreviewPage {
  items: PreviewRow[];
  total: number;
  limit: number;
  offset: number;
}

interface ConfirmResponse {
  status: string;
  total_rows: number;
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  invalid_rows: number;
}

interface ImportRowError {
  row_number: number;
  field: string | null;
  message: string;
}

// Chave de messages/*.json (camelCase) para cada valor de confiança/status —
// os rótulos ficam no componente (via useTranslations), aqui só o mapeamento
// de chave, mesmo padrão de `METRIC_LABEL_KEY` em lib/metrics.ts.
const CONFIDENCE_LABEL_KEY: Record<MappingSuggestion["confidence"], string> = {
  alta: "confidenceHigh",
  media: "confidenceMedium",
  baixa: "confidenceLow",
  sem_correspondencia: "confidenceNone",
};

const CONFIDENCE_TONE: Record<MappingSuggestion["confidence"], "blue" | "slate"> = {
  alta: "blue",
  media: "slate",
  baixa: "slate",
  sem_correspondencia: "slate",
};

const STATUS_LABEL_KEY: Record<PreviewRow["status"], string> = {
  valid: "statusValid",
  invalid: "statusInvalid",
  duplicate: "statusDuplicate",
};

const PREVIEW_PAGE_SIZE = 50;

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}

/** Seção só visível para ANALYST+ (é escrita) — a página que compõe este
 * componente já esconde tudo isto para VIEWER (ver page.tsx/lib/roles.ts). */
export function ImportWizard({
  organizationId,
  onImportCompleted,
}: {
  organizationId: string;
  onImportCompleted?: () => void;
}) {
  const t = useTranslations("centralDeDados.importWizard");
  // Nunca oferece um domínio export-only (ex.: Auditoria) como destino de
  // import — DOMAIN_REGISTRY é compartilhado com exports/, mas import é
  // sempre um subconjunto.
  const dataDomains = useDataDomains().filter((d) => d.importable);
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);

  const [domain, setDomain] = useState(dataDomains[0].key);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  const [job, setJob] = useState<ImportJob | null>(null);
  const [domainFields, setDomainFields] = useState<DomainField[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, MappingSuggestion>>({});
  const [dateFormat, setDateFormat] = useState<DateFormat>("DMY");
  const [savingMapping, setSavingMapping] = useState(false);

  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");
  const [confirming, setConfirming] = useState(false);

  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null);
  const [rowErrors, setRowErrors] = useState<ImportRowError[] | null>(null);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function resetWizard() {
    setStep("upload");
    setError(null);
    setFile(null);
    setSheetOptions([]);
    setSelectedSheet("");
    setJob(null);
    setDomainFields([]);
    setHeaders([]);
    setMapping({});
    setSuggestions({});
    setDateFormat("DMY");
    setSummary(null);
    setPreviewRows([]);
    setPreviewTotal(0);
    setDuplicateStrategy("skip");
    setConfirmResult(null);
    setRowErrors(null);
  }

  async function loadPreview(jobId: string, offset: number) {
    setPreviewLoading(true);
    try {
      const page = await api.get<PreviewPage>(
        `/api/v1/organizations/${organizationId}/imports/${jobId}/preview?limit=${PREVIEW_PAGE_SIZE}&offset=${offset}`
      );
      setPreviewRows((prev) => (offset === 0 ? page.items : [...prev, ...page.items]));
      setPreviewTotal(page.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("previewLoadError"));
    } finally {
      setPreviewLoading(false);
    }
  }

  /** Comum às duas chamadas de upload (primeira tentativa, e o reenvio do
   * MESMO arquivo depois que o usuário escolhe a aba) — o arquivo .xlsx com
   * mais de uma aba não gera job na primeira chamada (ver
   * `needsSheetSelection`), então o wizard guarda o `File` em memória e
   * refaz o POST com `sheet_name` preenchido, sem pedir pra escolher o
   * arquivo de novo. */
  async function submitUpload(sheetName?: string) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("domain", domain);
      formData.append("file", file);
      if (sheetName) formData.append("sheet_name", sheetName);
      const response = await api.postForm<ImportUploadResponse>(
        `/api/v1/organizations/${organizationId}/imports`,
        formData
      );

      if (needsSheetSelection(response)) {
        setSheetOptions(response.sheets);
        setSelectedSheet(response.sheets[0] ?? "");
        setStep("sheet");
        return;
      }

      const suggestionByHeader: Record<string, MappingSuggestion> = {};
      const initialMapping: Record<string, string> = {};
      for (const suggestion of response.suggested_mapping) {
        suggestionByHeader[suggestion.header] = suggestion;
        if (suggestion.canonical_field) initialMapping[suggestion.header] = suggestion.canonical_field;
      }

      setJob(response.job);
      setDomainFields(response.domain_fields);
      setHeaders(response.suggested_mapping.map((s) => s.header));
      setSuggestions(suggestionByHeader);
      setMapping(initialMapping);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitUpload();
  }

  async function handleSheetSubmit() {
    if (!selectedSheet) return;
    await submitUpload(selectedSheet);
  }

  function handleMappingChange(header: string, canonicalField: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (canonicalField) next[header] = canonicalField;
      else delete next[header];
      return next;
    });
  }

  async function handleMappingSubmit() {
    if (!job) return;
    setError(null);
    setSavingMapping(true);
    try {
      const result = await api.put<ValidationSummary>(
        `/api/v1/organizations/${organizationId}/imports/${job.id}/mapping`,
        { mapping, transform_config: { date_format: dateFormat } }
      );
      setSummary(result);
      if (result.status === "READY") {
        setStep("preview");
        await loadPreview(job.id, 0);
      } else {
        const missing = domainFields.filter(
          (f) => f.required && !Object.values(mapping).includes(f.canonical_name)
        );
        setError(
          missing.length > 0
            ? t("missingRequiredField", { fields: missing.map((f) => f.display_name).join(", ") })
            : t("incompleteMapping")
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("mappingSaveError"));
    } finally {
      setSavingMapping(false);
    }
  }

  async function handleConfirm() {
    if (!job) return;
    setError(null);
    setConfirming(true);
    try {
      const result = await api.post<ConfirmResponse>(
        `/api/v1/organizations/${organizationId}/imports/${job.id}/confirm`,
        { duplicate_strategy: duplicateStrategy }
      );
      setConfirmResult(result);
      setStep("done");
      onImportCompleted?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("confirmError"));
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancel() {
    if (!job) {
      resetWizard();
      return;
    }
    setCancelling(true);
    try {
      await api.del(`/api/v1/organizations/${organizationId}/imports/${job.id}`);
    } catch {
      // Cancelar é uma limpeza best-effort — mesmo se falhar (ex.: já
      // concluído em outra aba), a UI volta para o início de qualquer jeito.
    } finally {
      setCancelling(false);
      resetWizard();
    }
  }

  async function handleViewErrors() {
    if (!job) return;
    setLoadingErrors(true);
    try {
      const page = await api.get<{ items: ImportRowError[] }>(
        `/api/v1/organizations/${organizationId}/imports/${job.id}/errors?limit=200`
      );
      setRowErrors(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorsLoadError"));
    } finally {
      setLoadingErrors(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <IconUpload className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      {step === "upload" && (
        <form onSubmit={(e) => void handleUpload(e)} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-wrap items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            {t("domainLabel")}
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className={`${selectClass} w-auto`}
            >
              {dataDomains.map(({ key, label: domainLabel }) => (
                <option key={key} value={key}>
                  {domainLabel}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("acceptedFormats")}</p>
          <input
            type="file"
            aria-label={t("fileLabel")}
            accept=".csv,.xlsx,.json"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-300 dark:file:bg-blue-500/10 dark:file:text-blue-300"
          />
          <button type="submit" disabled={!file || uploading} className={`${buttonPrimary} self-start`}>
            {uploading ? t("sending") : t("continueButton")}
          </button>
        </form>
      )}

      {step === "sheet" && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("sheetIntro", {
              fileName: file?.name ?? "",
              domainLabel: dataDomains.find((d) => d.key === domain)?.label ?? "",
            })}
          </p>
          <label className="flex flex-wrap items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            {t("sheetLabel")}
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className={`${selectClass} w-auto`}
            >
              {sheetOptions.map((sheetOption) => (
                <option key={sheetOption} value={sheetOption}>
                  {sheetOption}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={resetWizard} className={buttonSecondary}>
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleSheetSubmit()}
              disabled={!selectedSheet || uploading}
              className={buttonPrimary}
            >
              {uploading ? t("sending") : t("continueButton")}
            </button>
          </div>
        </div>
      )}

      {step === "mapping" && job && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {/* Nome do arquivo num <span> próprio (não dentro da mensagem
                traduzida) — o teste verifica o texto exato do arquivo
                isoladamente (screen.getByText("financeiro.csv")). */}
            <span className="font-medium text-slate-700 dark:text-slate-300">{job.source_filename}</span>
            {t("mappingIntroRest", {
              hasSheet: job.sheet_name ? "true" : "other",
              sheetName: job.sheet_name ?? "",
              rowCount: job.total_rows ?? 0,
            })}
          </p>

          <div className="flex flex-col gap-2">
            {headers.map((header) => {
              const suggestion = suggestions[header];
              return (
                <div key={header} className="flex flex-wrap items-center gap-2.5">
                  <span className="w-40 shrink-0 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                    {header}
                  </span>
                  <select
                    value={mapping[header] ?? ""}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    className={`${selectClass} w-auto min-w-48`}
                  >
                    <option value="">{t("doNotMap")}</option>
                    {domainFields.map((field) => (
                      <option key={field.canonical_name} value={field.canonical_name}>
                        {field.display_name}
                        {field.required ? t("requiredSuffix") : ""}
                      </option>
                    ))}
                  </select>
                  {suggestion && suggestion.confidence !== "sem_correspondencia" && (
                    <Badge tone={CONFIDENCE_TONE[suggestion.confidence]}>
                      {t(CONFIDENCE_LABEL_KEY[suggestion.confidence])}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {domainFields.some((f) => f.data_type === "date") && (
            <label className="flex flex-wrap items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              {t("dateFormatLabel")}
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                className={`${selectClass} w-auto`}
              >
                <option value="DMY">{t("dateFormatDMY")}</option>
                <option value="MDY">{t("dateFormatMDY")}</option>
                <option value="ISO">{t("dateFormatISO")}</option>
              </select>
            </label>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className={buttonSecondary}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleMappingSubmit()}
              disabled={savingMapping}
              className={buttonPrimary}
            >
              {savingMapping ? t("validating") : t("continueButton")}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && job && summary && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone="slate">{t("rowsSuffix", { count: summary.total })}</Badge>
            <Badge tone="blue">{t("validSuffix", { count: summary.valid })}</Badge>
            {summary.duplicate > 0 && <Badge tone="slate">{t("duplicateSuffix", { count: summary.duplicate })}</Badge>}
            {summary.invalid > 0 && <Badge tone="slate">{t("invalidSuffix", { count: summary.invalid })}</Badge>}
          </div>

          <ScrollableCard>
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className="px-3 py-2">{t("rowColumn")}</th>
                  <th className="px-3 py-2">{t("statusColumn")}</th>
                  <th className="px-3 py-2">{t("dataColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.row_number} className={tableRow}>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.row_number}</td>
                    <td className="px-3 py-2">
                      <Badge tone={row.status === "valid" ? "blue" : "slate"}>{t(STATUS_LABEL_KEY[row.status])}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {row.status === "invalid"
                        ? row.errors.map((e) => e.message).join("; ")
                        : Object.entries(row.transformed)
                            .map(([field, value]) => `${field}: ${formatCellValue(value)}`)
                            .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableCard>

          {previewRows.length < previewTotal && (
            <button
              type="button"
              onClick={() => void loadPreview(job.id, previewRows.length)}
              disabled={previewLoading}
              className={`${buttonSecondary} self-start`}
            >
              {previewLoading ? t("loadingEllipsis") : t("loadMore")}
            </button>
          )}

          {summary.duplicate > 0 && (
            <label className="flex flex-wrap items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              {t("duplicateRowsLabel")}
              <select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as DuplicateStrategy)}
                className={`${selectClass} w-auto`}
              >
                <option value="skip">{t("duplicateSkip")}</option>
                <option value="update">{t("duplicateUpdate")}</option>
              </select>
            </label>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className={buttonSecondary}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={confirming}
              className={buttonPrimary}
            >
              {confirming ? t("confirming") : t("confirmImport")}
            </button>
          </div>
        </div>
      )}

      {step === "done" && confirmResult && (
        <div className="mt-4 flex flex-col gap-4">
          <Alert tone={confirmResult.invalid_rows > 0 ? "warning" : "success"}>
            {t("importCompleted", {
              created: confirmResult.created_rows,
              updated: confirmResult.updated_rows,
              skipped: confirmResult.skipped_rows,
            })}
            {confirmResult.invalid_rows > 0 ? t("invalidPart", { count: confirmResult.invalid_rows }) : ""}.
          </Alert>

          {confirmResult.invalid_rows > 0 && !rowErrors && (
            <button
              type="button"
              onClick={() => void handleViewErrors()}
              disabled={loadingErrors}
              className={`${buttonSecondary} self-start`}
            >
              {loadingErrors ? t("loadingEllipsis") : t("viewErrors")}
            </button>
          )}

          {rowErrors && (
            <ScrollableCard>
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHead}>
                    <th className="px-3 py-2">{t("rowColumn")}</th>
                    <th className="px-3 py-2">{t("fieldColumn")}</th>
                    <th className="px-3 py-2">{t("errorColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rowErrors.map((e, i) => (
                    <tr key={i} className={tableRow}>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{e.row_number}</td>
                      <td className="px-3 py-2">{e.field ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableCard>
          )}

          <button type="button" onClick={resetWizard} className={`${buttonPrimary} self-start`}>
            {t("newImport")}
          </button>
        </div>
      )}
    </Card>
  );
}
