"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Card, Skeleton } from "@/components/ui";
import { IconShieldCheck } from "@/components/icons";

interface AuditLogEntry {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
}

async function fetchAuditLogs(id: string): Promise<AuditLogEntry[]> {
  return api.get<AuditLogEntry[]>(`/api/v1/organizations/${id}/audit-logs`);
}

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuditLogs(id)
      .then((result) => {
        if (!cancelled) setLogs(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setError("Apenas administradores da organização podem consultar a auditoria.");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Não foi possível conectar à API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconShieldCheck className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>Auditoria</h2>
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
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={tableHead}>
                    <th className="px-4 py-2.5">Quando</th>
                    <th className="px-4 py-2.5">Ação</th>
                    <th className="px-4 py-2.5">Entidade</th>
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
                        Nenhum evento registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
