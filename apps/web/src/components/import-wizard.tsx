"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, buttonSecondary, select as selectClass, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Badge, Card } from "@/components/ui";
import { IconUpload } from "@/components/icons";

// Único domínio existente hoje — deixa de ser fixo assim que um segundo
// domínio (Funil, Produtos...) existir no backend (ver
// docs/data-import-export/ARCHITECTURE.md).
const DOMAIN_KEY = "financial_periods";
const DOMAIN_LABEL = "Financeiro";

type Step = "upload" | "mapping" | "preview" | "done";
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
  status: string;
  total_rows: number | null;
}

interface ImportJobCreateResponse {
  job: ImportJob;
  suggested_mapping: MappingSuggestion[];
  domain_fields: DomainField[];
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

const CONFIDENCE_LABEL: Record<MappingSuggestion["confidence"], string> = {
  alta: "confiança alta",
  media: "confiança média",
  baixa: "confiança baixa",
  sem_correspondencia: "sem sugestão",
};

const CONFIDENCE_TONE: Record<MappingSuggestion["confidence"], "blue" | "slate"> = {
  alta: "blue",
  media: "slate",
  baixa: "slate",
  sem_correspondencia: "slate",
};

const STATUS_LABEL: Record<PreviewRow["status"], string> = {
  valid: "válida",
  invalid: "inválida",
  duplicate: "duplicada",
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
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar o preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("domain", DOMAIN_KEY);
      formData.append("file", file);
      const response = await api.postForm<ImportJobCreateResponse>(
        `/api/v1/organizations/${organizationId}/imports`,
        formData
      );

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
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
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
            ? `Campo obrigatório não mapeado: ${missing.map((f) => f.display_name).join(", ")}.`
            : "Mapeamento incompleto — revise os campos abaixo."
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o mapeamento.");
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
      setError(err instanceof ApiError ? err.message : "Não foi possível confirmar a importação.");
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
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar os erros.");
    } finally {
      setLoadingErrors(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <IconUpload className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Importar dados</h2>
      </div>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      {step === "upload" && (
        <form onSubmit={(e) => void handleUpload(e)} className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Domínio: <span className="font-medium text-slate-700 dark:text-slate-300">{DOMAIN_LABEL}</span>.
            Formatos aceitos: CSV, Excel (.xlsx) ou JSON, até 5&nbsp;MB.
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.json"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-300 dark:file:bg-blue-500/10 dark:file:text-blue-300"
          />
          <button type="submit" disabled={!file || uploading} className={`${buttonPrimary} self-start`}>
            {uploading ? "Enviando..." : "Continuar"}
          </button>
        </form>
      )}

      {step === "mapping" && job && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">{job.source_filename}</span> —{" "}
            {job.total_rows ?? 0} linha(s). Confirme para qual campo cada coluna do arquivo corresponde.
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
                    <option value="">— não mapear —</option>
                    {domainFields.map((field) => (
                      <option key={field.canonical_name} value={field.canonical_name}>
                        {field.display_name}
                        {field.required ? " (obrigatório)" : ""}
                      </option>
                    ))}
                  </select>
                  {suggestion && suggestion.confidence !== "sem_correspondencia" && (
                    <Badge tone={CONFIDENCE_TONE[suggestion.confidence]}>
                      {CONFIDENCE_LABEL[suggestion.confidence]}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          <label className="flex flex-wrap items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            Formato de data (campo Período)
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value as DateFormat)}
              className={`${selectClass} w-auto`}
            >
              <option value="DMY">Dia/Mês/Ano (31/12/2026)</option>
              <option value="MDY">Mês/Dia/Ano (12/31/2026)</option>
              <option value="ISO">Ano-Mês-Dia (2026-12-31)</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className={buttonSecondary}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleMappingSubmit()}
              disabled={savingMapping}
              className={buttonPrimary}
            >
              {savingMapping ? "Validando..." : "Continuar"}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && job && summary && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone="slate">{summary.total} linha(s)</Badge>
            <Badge tone="blue">{summary.valid} válida(s)</Badge>
            {summary.duplicate > 0 && <Badge tone="slate">{summary.duplicate} duplicada(s)</Badge>}
            {summary.invalid > 0 && <Badge tone="slate">{summary.invalid} inválida(s)</Badge>}
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Dados</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.row_number} className={tableRow}>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.row_number}</td>
                    <td className="px-3 py-2">
                      <Badge tone={row.status === "valid" ? "blue" : "slate"}>{STATUS_LABEL[row.status]}</Badge>
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
          </Card>

          {previewRows.length < previewTotal && (
            <button
              type="button"
              onClick={() => void loadPreview(job.id, previewRows.length)}
              disabled={previewLoading}
              className={`${buttonSecondary} self-start`}
            >
              {previewLoading ? "Carregando..." : "Carregar mais"}
            </button>
          )}

          {summary.duplicate > 0 && (
            <label className="flex flex-wrap items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              Linhas duplicadas
              <select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as DuplicateStrategy)}
                className={`${selectClass} w-auto`}
              >
                <option value="skip">Ignorar (manter o registro já existente)</option>
                <option value="update">Atualizar o registro já existente</option>
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
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={confirming}
              className={buttonPrimary}
            >
              {confirming ? "Confirmando..." : "Confirmar importação"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && confirmResult && (
        <div className="mt-4 flex flex-col gap-4">
          <Alert tone={confirmResult.invalid_rows > 0 ? "warning" : "success"}>
            Importação concluída: {confirmResult.created_rows} criado(s), {confirmResult.updated_rows}{" "}
            atualizado(s), {confirmResult.skipped_rows} ignorado(s)
            {confirmResult.invalid_rows > 0 ? `, ${confirmResult.invalid_rows} inválido(s)` : ""}.
          </Alert>

          {confirmResult.invalid_rows > 0 && !rowErrors && (
            <button
              type="button"
              onClick={() => void handleViewErrors()}
              disabled={loadingErrors}
              className={`${buttonSecondary} self-start`}
            >
              {loadingErrors ? "Carregando..." : "Ver erros"}
            </button>
          )}

          {rowErrors && (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHead}>
                    <th className="px-3 py-2">Linha</th>
                    <th className="px-3 py-2">Campo</th>
                    <th className="px-3 py-2">Erro</th>
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
            </Card>
          )}

          <button type="button" onClick={resetWizard} className={`${buttonPrimary} self-start`}>
            Nova importação
          </button>
        </div>
      )}
    </Card>
  );
}
