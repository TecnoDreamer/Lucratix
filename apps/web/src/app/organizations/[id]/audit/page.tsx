"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonSecondary, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Skeleton } from "@/components/ui";
import { IconShieldCheck } from "@/components/icons";
import { ScrollableCard } from "@/components/scrollable-card";

interface AuditLogEntry {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
}

interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 50;

function fetchAuditLogs(id: string, offset: number): Promise<AuditLogPage> {
  return api.get<AuditLogPage>(
    `/api/v1/organizations/${id}/audit-logs?limit=${PAGE_SIZE}&offset=${offset}`
  );
}

export default function AuditPage() {
  const t = useTranslations("audit");
  const tCommon = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError(t("forbidden"));
        return;
      }
      setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
    },
    // t/tCommon (tradutores) omitidos de propósito: nunca são referencialmente
    // estáveis entre renders — ver nota em organizations/page.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  useEffect(() => {
    let cancelled = false;
    fetchAuditLogs(id, 0)
      .then((page) => {
        if (cancelled) return;
        setLogs(page.items);
        setTotal(page.total);
      })
      .catch((err: unknown) => {
        if (!cancelled) handleError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, handleError]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchAuditLogs(id, logs.length);
      setLogs((prev) => [...prev, ...page.items]);
      setTotal(page.total);
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = logs.length < total;

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconShieldCheck className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {!error && (
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <ScrollableCard>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={tableHead}>
                      <th className="px-4 py-2.5">{t("whenColumn")}</th>
                      <th className="px-4 py-2.5">{t("actionColumn")}</th>
                      <th className="px-4 py-2.5">{t("entityColumn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className={tableRow}>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                          {log.action}
                        </td>
                        <td className="px-4 py-2.5">{log.entity}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          {t("empty")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollableCard>

              {logs.length > 0 && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>{tCommon("showingCount", { shown: logs.length, total })}</span>
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
