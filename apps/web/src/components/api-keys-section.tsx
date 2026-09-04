"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { buttonGhost, buttonPrimary, card, input, label as labelClass } from "@/lib/ui";
import { Alert, EmptyState } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ApiKey, ApiKeyCreated } from "@/lib/types";

function _formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Chaves de API por organização (docs/security/API_KEYS.md) — autenticam
 * ferramentas externas de analytics (Power BI, Looker Studio) via
 * `Authorization: Bearer <chave>` no lugar do cookie de sessão. Só visível
 * na tela de configurações (já gated a ORGANIZATION_ADMIN+ pelo componente
 * pai) — a autorização de verdade é sempre decidida pelo backend. */
export function ApiKeysSection({ organizationId }: { organizationId: string }) {
  const t = useTranslations("orgSettings.apiKeys");
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setKeys(await api.get<ApiKey[]>(`/api/v1/organizations/${organizationId}/api-keys`));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t("loadError"));
    }
    // t (tradutor) omitido de proposito: nao e referencialmente estavel
    // entre renders — mesma nota de organizations/page.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  useEffect(() => {
    void Promise.resolve().then(() => void load());
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await api.post<ApiKeyCreated>(
        `/api/v1/organizations/${organizationId}/api-keys`,
        { name },
      );
      setRevealedKey(created);
      setName("");
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : t("createError"));
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(rawKey: string) {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API pode falhar (permissão, contexto não seguro) — o
      // valor continua selecionável/copiável manualmente na caixa de texto.
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      await api.del(`/api/v1/organizations/${organizationId}/api-keys/${revokeTarget.id}`);
      setRevokeTarget(null);
      await load();
    } catch (err) {
      setRevokeError(err instanceof ApiError ? err.message : t("revokeError"));
    } finally {
      setRevoking(false);
    }
  }

  const activeKeys = keys?.filter((k) => !k.revoked_at) ?? [];
  const revokedKeys = keys?.filter((k) => k.revoked_at) ?? [];

  return (
    <div className={`${card} mt-6 p-5`}>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("heading")}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      {loadError && (
        <div className="mt-4">
          <Alert>{loadError}</Alert>
        </div>
      )}

      {revealedKey && (
        <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="font-semibold">{t("revealTitle")}</p>
          <p className="mt-1">{t("revealDescription")}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded border border-amber-200 bg-white/60 px-2 py-1 dark:border-amber-900 dark:bg-black/20">
              {revealedKey.raw_key}
            </code>
            <button
              type="button"
              onClick={() => void handleCopy(revealedKey.raw_key)}
              className={`${buttonGhost} shrink-0 !text-amber-800 dark:!text-amber-300`}
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedKey(null)}
            className="mt-2 underline"
          >
            {t("dismissReveal")}
          </button>
        </div>
      )}

      {keys !== null && keys.length === 0 && !revealedKey && (
        <div className="mt-4">
          <EmptyState title={t("empty")} />
        </div>
      )}

      {activeKeys.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {activeKeys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-50">{k.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <code>{k.key_prefix}…</code> · {t("createdAt", { date: _formatDate(k.created_at) })}
                  {k.last_used_at
                    ? ` · ${t("lastUsedAt", { date: _formatDate(k.last_used_at) })}`
                    : ` · ${t("neverUsed")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevokeTarget(k)}
                className={`${buttonGhost} shrink-0 !text-rose-700 dark:!text-rose-300`}
              >
                {t("revoke")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {revokedKeys.length > 0 && (
        <details className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer select-none">{t("revokedHeading", { count: revokedKeys.length })}</summary>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {revokedKeys.map((k) => (
              <li key={k.id} className="py-2 text-xs">
                {k.name} · <code>{k.key_prefix}…</code>
              </li>
            ))}
          </ul>
        </details>
      )}

      <form onSubmit={handleCreate} className="mt-4 flex items-end gap-2">
        <label className={`${labelClass} flex-1`}>
          {t("newKeyLabel")}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("newKeyPlaceholder")}
            className={input}
          />
        </label>
        <button type="submit" disabled={creating} className={buttonPrimary}>
          {creating ? t("creating") : t("createKey")}
        </button>
      </form>
      {createError && (
        <div className="mt-3">
          <Alert>{createError}</Alert>
        </div>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        title={t("revokeDialogTitle")}
        description={t("revokeDialogDescription")}
        confirmLabel={t("revokeConfirmLabel")}
        tone="danger"
        confirming={revoking}
        error={revokeError}
        onConfirm={() => void handleRevoke()}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
