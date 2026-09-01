"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, buttonDanger, card, input, label, link as linkClass, select as selectClass, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import { IconArrowLeft, IconTrash, IconUser } from "@/components/icons";
import { useRoleLabel } from "@/lib/roles";
import type { Membership, MembershipRole } from "@/lib/types";

const ROLE_OPTIONS: MembershipRole[] = ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN", "ANALYST", "VIEWER"];

export default function AdminOrganizationMembersPage() {
  const t = useTranslations("admin.members");
  const { id } = useParams<{ id: string }>();
  const roleLabel = useRoleLabel();

  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MembershipRole>("ANALYST");
  const [granting, setGranting] = useState(false);
  const [grantResult, setGrantResult] = useState<Membership | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Membership[]>(`/api/v1/platform/organizations/${id}/memberships`);
      setMembers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
    // t (tradutor) omitido de propósito: nunca é referencialmente estável
    // entre renders — ver nota em organizations/page.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(() => void load());
  }, [load]);

  async function handleGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setGrantResult(null);
    setGranting(true);
    try {
      const membership = await api.post<Membership>(`/api/v1/platform/organizations/${id}/memberships`, {
        email,
        name: name.trim() || undefined,
        role,
      });
      setMembers((prev) => [...prev, membership]);
      setGrantResult(membership);
      setEmail("");
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("grantError"));
    } finally {
      setGranting(false);
    }
  }

  async function handleRoleChange(membershipId: string, newRole: MembershipRole) {
    setError(null);
    try {
      const updated = await api.patch<Membership>(
        `/api/v1/platform/organizations/${id}/memberships/${membershipId}`,
        { role: newRole }
      );
      setMembers((prev) => prev.map((m) => (m.id === membershipId ? { ...m, role: updated.role } : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("roleChangeError"));
    }
  }

  async function handleRevoke(membershipId: string) {
    setError(null);
    setRevokingId(membershipId);
    try {
      await api.del(`/api/v1/platform/organizations/${id}/memberships/${membershipId}`);
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("revokeError"));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <Link href="/admin/organizations" className={`inline-flex items-center gap-1 text-sm ${linkClass}`}>
        <IconArrowLeft className="h-4 w-4" /> {t("backToOrganizations")}
      </Link>

      <h2 className={`${sectionTitle} mt-3`}>{t("title")}</h2>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : members.length === 0 ? (
          <EmptyState icon={<IconUser className="h-5 w-5" />} title={t("empty")} />
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className="px-3 py-2">{t("nameColumn")}</th>
                  <th className="px-3 py-2">{t("emailColumn")}</th>
                  <th className="px-3 py-2">{t("roleColumn")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className={tableRow}>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">{m.user_name}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{m.user_email}</td>
                    <td className="px-3 py-2">
                      <select
                        value={m.role}
                        onChange={(e) => void handleRoleChange(m.id, e.target.value as MembershipRole)}
                        className={`${selectClass} w-auto`}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void handleRevoke(m.id)}
                        disabled={revokingId === m.id}
                        className={`${buttonDanger} px-2.5 py-1 text-xs`}
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                        {revokingId === m.id ? t("revoking") : t("revoke")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${card} mt-6 p-5`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("grantAccess")}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("grantAccessHint")}</p>
        <form onSubmit={(e) => void handleGrant(e)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
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
          <label className={`flex-1 ${label}`}>
            {t("nameIfNoAccount")}
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className={label}>
            {t("roleColumn")}
            <select value={role} onChange={(e) => setRole(e.target.value as MembershipRole)} className={selectClass}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={granting} className={buttonPrimary}>
            {granting ? t("granting") : t("grantAccess")}
          </button>
        </form>

        {grantResult?.dev_token && (
          <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="font-semibold">{t("devModeTitle")}</p>
            <p className="mt-1">{t("devModeAccountCreated", { email: grantResult.user_email })}</p>
            <Link
              href={`/redefinir-senha?token=${encodeURIComponent(grantResult.dev_token)}`}
              className="mt-1 inline-block break-all underline"
            >
              /redefinir-senha?token={grantResult.dev_token}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
