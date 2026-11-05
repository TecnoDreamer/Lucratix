"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { buttonDanger, buttonPrimary, card, input, label, select as selectClass, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { IconTrash, IconUsers } from "@/components/icons";
import { ScrollableCard } from "@/components/scrollable-card";
import { useOrganization } from "@/contexts/organization-context";
import { hasMinimumRole, useRoleLabel } from "@/lib/roles";
import type { Membership, MembershipRole, User } from "@/lib/types";

const ROLE_OPTIONS: MembershipRole[] = ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN", "ANALYST", "VIEWER"];

/** Equipe da EMPRESA (G-03): convidar, trocar papel e revogar membros pelos
 * endpoints org-scoped de `memberships/router.py`. Mesmo desenho da tela do
 * Super Admin (`admin/organizations/[id]`), mas com as restrições de quem é
 * admin da própria empresa: só atribui papéis iguais ou inferiores ao seu e
 * não mexe em quem tem papel superior nem em si mesmo. A UI só evita oferecer
 * o que terminaria em 403/400 — a decisão de verdade é do backend. */
export default function TeamPage() {
  const t = useTranslations("team");
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrganization();
  const roleLabel = useRoleLabel();
  const myRole = organization?.my_role ?? null;

  const [members, setMembers] = useState<Membership[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MembershipRole>("VIEWER");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<Membership | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<Membership | null>(null);
  const [revoking, setRevoking] = useState(false);

  const assignableRoles = ROLE_OPTIONS.filter((r) => hasMinimumRole(myRole, r));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, me] = await Promise.all([
        api.get<Membership[]>(`/api/v1/organizations/${id}/memberships`),
        api.get<User>("/api/v1/auth/me"),
      ]);
      setMembers(data);
      setCurrentUserId(me.id);
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

  // Papel atual do viewer na lista pode não estar disponível ainda; sem
  // `myRole` nada é editável (fail-closed).
  function canManage(member: Membership): boolean {
    return member.user_id !== currentUserId && hasMinimumRole(myRole, member.role);
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInviteResult(null);
    setInviting(true);
    try {
      const membership = await api.post<Membership>(`/api/v1/organizations/${id}/memberships`, {
        email,
        name: name.trim() || undefined,
        role,
      });
      setMembers((prev) => [...prev, membership]);
      setInviteResult(membership);
      setEmail("");
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("inviteError"));
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(membershipId: string, newRole: MembershipRole) {
    setError(null);
    try {
      const updated = await api.patch<Membership>(`/api/v1/organizations/${id}/memberships/${membershipId}`, {
        role: newRole,
      });
      setMembers((prev) => prev.map((m) => (m.id === membershipId ? { ...m, role: updated.role } : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("roleChangeError"));
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setError(null);
    setRevoking(true);
    try {
      await api.del(`/api/v1/organizations/${id}/memberships/${revokeTarget.id}`);
      setMembers((prev) => prev.filter((m) => m.id !== revokeTarget.id));
      setRevokeTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("revokeError"));
      setRevokeTarget(null);
    } finally {
      setRevoking(false);
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
        ) : members.length === 0 ? (
          <EmptyState icon={<IconUsers className="h-5 w-5" />} title={t("empty")} />
        ) : (
          <ScrollableCard>
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
                {members.map((m) => {
                  const manageable = canManage(m);
                  return (
                    <tr key={m.id} className={tableRow}>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                        {m.user_name}
                        {m.user_id === currentUserId && (
                          <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                            ({t("you")})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{m.user_email}</td>
                      <td className="px-3 py-2">
                        {manageable ? (
                          <select
                            value={m.role}
                            aria-label={`${t("roleColumn")} — ${m.user_name}`}
                            onChange={(e) => void handleRoleChange(m.id, e.target.value as MembershipRole)}
                            className={`${selectClass} w-auto`}
                          >
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-200" title={m.user_id === currentUserId ? undefined : t("locked")}>
                            {roleLabel(m.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {manageable && (
                          <button
                            type="button"
                            onClick={() => setRevokeTarget(m)}
                            className={`${buttonDanger} px-2.5 py-1 text-xs`}
                            aria-label={`${t("revoke")} — ${m.user_name}`}
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                            {t("revoke")}
                          </button>
                        )}
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
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("invite")}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("inviteHint")}</p>
        <form onSubmit={(e) => void handleInvite(e)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          <label className={`flex-1 ${label}`}>
            {t("emailColumn")}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
          <label className={`flex-1 ${label}`}>
            {t("nameIfNoAccount")}
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className={label}>
            {t("roleColumn")}
            <select value={role} onChange={(e) => setRole(e.target.value as MembershipRole)} className={selectClass}>
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={inviting} className={buttonPrimary}>
            {inviting ? t("inviting") : t("invite")}
          </button>
        </form>

        {inviteResult && (
          <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
            {t("invited", { email: inviteResult.user_email })}
          </p>
        )}

        {inviteResult?.dev_token && (
          <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="font-semibold">{t("devModeTitle")}</p>
            <p className="mt-1">{t("devModeAccountCreated", { email: inviteResult.user_email })}</p>
            <Link
              href={`/redefinir-senha?token=${encodeURIComponent(inviteResult.dev_token)}`}
              className="mt-1 inline-block break-all underline"
            >
              /redefinir-senha?token={inviteResult.dev_token}
            </Link>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={revokeTarget !== null}
        title={t("revokeConfirm", { name: revokeTarget?.user_name ?? "" })}
        confirmLabel={t("revoke")}
        tone="danger"
        confirming={revoking}
        onConfirm={() => void handleRevoke()}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
