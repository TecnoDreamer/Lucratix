"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonSecondary, sectionTitle } from "@/lib/ui";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui";
import { AccordionItem } from "@/components/accordion-item";
import { ExportPanel } from "@/components/export-panel";
import { ImportWizard } from "@/components/import-wizard";
import { useOrganization } from "@/contexts/organization-context";
import { canPerformActions } from "@/lib/roles";
import { IconClock, IconDatabase } from "@/components/icons";

interface ImportJobEntry {
  id: string;
  source_filename: string;
  file_format: string;
  status: string;
  total_rows: number | null;
  valid_rows: number | null;
  invalid_rows: number | null;
  duplicate_rows: number | null;
  created_rows: number | null;
  updated_rows: number | null;
  skipped_rows: number | null;
  created_at: string;
}

interface ImportJobPage {
  items: ImportJobEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface ImportRowErrorEntry {
  row_number: number;
  field: string | null;
  message: string;
}

// Rótulo traduzido no componente (useTranslations) — aqui só o mapeamento de
// status para a chave de messages/*.json, mesmo padrão de import-wizard.tsx.
const STATUS_LABEL_KEY: Record<string, string> = {
  UPLOADED: "sent",
  MAPPING_REQUIRED: "awaitingMapping",
  READY: "readyToConfirm",
  COMPLETED: "completed",
  COMPLETED_WITH_ERRORS: "completedWithErrors",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const HISTORY_PAGE_SIZE = 20;

function fetchImportHistory(organizationId: string, offset: number): Promise<ImportJobPage> {
  return api.get<ImportJobPage>(
    `/api/v1/organizations/${organizationId}/imports?limit=${HISTORY_PAGE_SIZE}&offset=${offset}`
  );
}

export default function CentralDeDadosPage() {
  const t = useTranslations("centralDeDados");
  const tCommon = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization, loading: orgLoading } = useOrganization();
  const canWrite = canPerformActions(organization?.my_role);

  const [jobs, setJobs] = useState<ImportJobEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrorsByJob, setRowErrorsByJob] = useState<Record<string, ImportRowErrorEntry[]>>({});
  const [loadingErrorsFor, setLoadingErrorsFor] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return;
      }
      setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
    },
    // tCommon (tradutor) omitido de propósito: nunca é referencialmente
    // estável entre renders — ver nota em organizations/page.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  const loadHistory = useCallback(() => {
    // setLoading(true) adiada para um microtask — mesma técnica de
    // layout.tsx: setState direto dentro do corpo síncrono de um efeito
    // (quando este load é disparado pelo useEffect abaixo) é sinalizado pelo
    // eslint-plugin-react-hooks; chamado por um clique (ImportWizard
    // confirmando uma importação) não tem esse problema, mas a mesma função
    // atende os dois casos.
    void Promise.resolve().then(() => setLoading(true));
    fetchImportHistory(id, 0)
      .then((page) => {
        setJobs(page.items);
        setTotal(page.total);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [id, handleError]);

  // Só busca o histórico depois que o papel do usuário é conhecido e
  // confirma escrita (VIEWER nem vê esta seção — ver render abaixo); evita
  // uma chamada a um endpoint que devolveria 403 para VIEWER.
  useEffect(() => {
    if (canWrite) loadHistory();
  }, [canWrite, loadHistory]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchImportHistory(id, jobs.length);
      setJobs((prev) => [...prev, ...page.items]);
      setTotal(page.total);
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleViewJobErrors(jobId: string) {
    setLoadingErrorsFor(jobId);
    try {
      const page = await api.get<{ items: ImportRowErrorEntry[] }>(
        `/api/v1/organizations/${id}/imports/${jobId}/errors?limit=200`
      );
      setRowErrorsByJob((prev) => ({ ...prev, [jobId]: page.items }));
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingErrorsFor(null);
    }
  }

  const hasMore = jobs.length < total;

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconDatabase className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      <div className="mt-6">
        <ExportPanel organizationId={id} />
      </div>

      {orgLoading ? (
        <div className="mt-6">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : canWrite ? (
        <>
          <div className="mt-6">
            <ImportWizard organizationId={id} onImportCompleted={loadHistory} />
          </div>

          <section className="mt-8">
            <div className="flex items-center gap-2">
              <IconClock className="h-4 w-4 text-slate-400" />
              <h2 className={sectionTitle}>{t("historyTitle")}</h2>
            </div>

            {error && (
              <div className="mt-3">
                <Alert>{error}</Alert>
              </div>
            )}

            {!error && (
              <div className="mt-3">
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : jobs.length === 0 ? (
                  <EmptyState
                    icon={<IconClock className="h-5 w-5" />}
                    title={t("emptyTitle")}
                    description={t("emptyDescription")}
                  />
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      {jobs.map((job) => (
                        <AccordionItem
                          key={job.id}
                          title={job.source_filename}
                          subtitle={`${STATUS_LABEL_KEY[job.status] ? t(`status.${STATUS_LABEL_KEY[job.status]}`) : job.status} · ${new Date(job.created_at).toLocaleString("pt-BR")}`}
                        >
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <Badge tone="slate">{t("history.rowsSuffix", { count: job.total_rows ?? 0 })}</Badge>
                            {job.created_rows !== null && job.created_rows > 0 && (
                              <Badge tone="blue">{t("history.createdSuffix", { count: job.created_rows })}</Badge>
                            )}
                            {job.updated_rows !== null && job.updated_rows > 0 && (
                              <Badge tone="blue">{t("history.updatedSuffix", { count: job.updated_rows })}</Badge>
                            )}
                            {job.skipped_rows !== null && job.skipped_rows > 0 && (
                              <Badge tone="slate">{t("history.skippedSuffix", { count: job.skipped_rows })}</Badge>
                            )}
                            {job.invalid_rows !== null && job.invalid_rows > 0 && (
                              <Badge tone="slate">{t("history.invalidSuffix", { count: job.invalid_rows })}</Badge>
                            )}
                          </div>

                          {job.invalid_rows !== null && job.invalid_rows > 0 && (
                            <div className="mt-3">
                              {!rowErrorsByJob[job.id] ? (
                                <button
                                  type="button"
                                  onClick={() => void handleViewJobErrors(job.id)}
                                  disabled={loadingErrorsFor === job.id}
                                  className={buttonSecondary}
                                >
                                  {loadingErrorsFor === job.id ? tCommon("loading") : t("importWizard.viewErrors")}
                                </button>
                              ) : (
                                <ul className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                                  {rowErrorsByJob[job.id].map((e, i) => (
                                    <li key={i}>
                                      {t("history.rowError", {
                                        hasField: e.field ? "true" : "other",
                                        number: e.row_number,
                                        field: e.field ?? "",
                                      })}
                                      {e.message}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </AccordionItem>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span>{tCommon("showingCount", { shown: jobs.length, total })}</span>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => void handleLoadMore()}
                          disabled={loadingMore}
                          className={buttonSecondary}
                        >
                          {loadingMore ? tCommon("loading") : tCommon("loadMore")}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="mt-6">
          <Alert tone="warning">{t("writeRestricted")}</Alert>
        </div>
      )}
    </div>
  );
}
