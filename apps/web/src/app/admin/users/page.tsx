"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, buttonSecondary, card, input, label, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Badge, EmptyState, Skeleton } from "@/components/ui";
import { IconUser } from "@/components/icons";
import type { PlatformUser, PlatformUserCreateResponse } from "@/lib/platform-admin";
import type { User } from "@/lib/types";
import { ScrollableCard } from "@/components/scrollable-card";

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meResult, usersResult] = await Promise.all([
        api.get<User>("/api/v1/auth/me"),
        api.get<PlatformUser[]>("/api/v1/platform/users"),
      ]);
      setMe(meResult);
      setUsers(usersResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
    // t (tradutor) omitido de propósito: nunca é referencialmente estável
    // entre renders — ver nota em organizations/page.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => void load());
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDevToken(null);
    setCreating(true);
    try {
      const result = await api.post<PlatformUserCreateResponse>("/api/v1/platform/users", { name, email });
      setUsers((prev) => [...prev, result.user]);
      setDevToken(result.dev_token);
      setName("");
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createError"));
    } finally {
      setCreating(false);
    }
  }

  async function toggle(userId: string, field: "is_active" | "is_platform_admin", value: boolean) {
    setError(null);
    setPendingUserId(userId);
    try {
      const updated = await api.patch<PlatformUser>(`/api/v1/platform/users/${userId}`, { [field]: value });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("updateError"));
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <h2 className={sectionTitle}>{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : users.length === 0 ? (
          <EmptyState icon={<IconUser className="h-5 w-5" />} title={t("empty")} />
        ) : (
          <ScrollableCard>
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className="px-3 py-2">{t("nameColumn")}</th>
                  <th className="px-3 py-2">{t("emailColumn")}</th>
                  <th className="px-3 py-2">{t("organizationsColumn")}</th>
                  <th className="px-3 py-2">{t("statusColumn")}</th>
                  <th className="px-3 py-2">{t("superAdminColumn")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className={tableRow}>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                        {u.name} {isSelf && <span className="text-xs text-slate-500 dark:text-slate-400">{t("you")}</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{u.organization_count}</td>
                      <td className="px-3 py-2">
                        <Badge tone={u.is_active ? "emerald" : "slate"}>
                          {u.is_active ? t("active") : t("inactive")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {u.is_platform_admin ? <Badge tone="blue">{t("superAdminBadge")}</Badge> : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={(isSelf && u.is_active) || pendingUserId === u.id}
                            onClick={() => void toggle(u.id, "is_active", !u.is_active)}
                            className={`${buttonSecondary} px-2.5 py-1 text-xs`}
                          >
                            {u.is_active ? t("deactivate") : t("activate")}
                          </button>
                          <button
                            type="button"
                            disabled={(isSelf && u.is_platform_admin) || pendingUserId === u.id}
                            onClick={() => void toggle(u.id, "is_platform_admin", !u.is_platform_admin)}
                            className={`${buttonSecondary} px-2.5 py-1 text-xs`}
                          >
                            {u.is_platform_admin ? t("removeSuperAdmin") : t("makeSuperAdmin")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollableCard>
        )}
      </div>

      <div className={`${card} mt-6 p-5`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("createUser")}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("createUserHint")}</p>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={`flex-1 ${label}`}>
            {t("nameColumn")}
            <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className={`flex-1 ${label}`}>
            {t("emailColumn")}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </label>
          <button type="submit" disabled={creating} className={buttonPrimary}>
            {creating ? t("creating") : t("createUser")}
          </button>
        </form>

        {devToken && (
          <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="font-semibold">{t("devModeTitle")}</p>
            <p className="mt-1">{t("devModeCopyLink")}</p>
            <Link
              href={`/redefinir-senha?token=${encodeURIComponent(devToken)}`}
              className="mt-1 inline-block break-all underline"
            >
              /redefinir-senha?token={devToken}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
