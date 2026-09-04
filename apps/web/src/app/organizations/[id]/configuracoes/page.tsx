"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonDanger, buttonPrimary, card, input, label as labelClass, sectionTitle } from "@/lib/ui";
import { Alert, EmptyState } from "@/components/ui";
import { ApiKeysSection } from "@/components/api-keys-section";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LogoUploader } from "@/components/logo-uploader";
import { useOrganization } from "@/contexts/organization-context";
import { hasMinimumRole } from "@/lib/roles";
import { IconSettings } from "@/components/icons";
import type { Organization } from "@/lib/types";

/** Central de dados cadastrais + logotipo + ciclo de vida de UMA empresa —
 * não existia nenhuma tela de edição de organização antes desta feature
 * (PATCH /organizations/{id} não tinha nenhum consumidor no frontend).
 * Gate de UI só (`hasMinimumRole`) — a autorização de verdade é sempre
 * decidida pelo backend (require_role/require_org_admin_or_platform_admin). */
export default function OrganizationSettingsPage() {
  const t = useTranslations("orgSettings");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization: current, loading: contextLoading, onOrganizationUpdate } = useOrganization();

  if (!contextLoading && !current) {
    return (
      <div className="animate-fade-in-up py-8">
        <EmptyState title={t("loadError")} />
      </div>
    );
  }

  if (!current) {
    return null;
  }

  if (!hasMinimumRole(current.my_role, "ORGANIZATION_ADMIN")) {
    return (
      <div className="animate-fade-in-up py-8">
        <EmptyState title={t("forbidden")} />
      </div>
    );
  }

  // Empurra a resposta de PATCH/logo/freeze/reactivate de volta pro layout
  // (via contexto) — o banner de "empresa encerrada" e a sidebar (nome/
  // logo) refletem na hora, sem esperar um refetch completo (troca de
  // rota/reload). Ver contexts/organization-context.tsx.
  function handleUpdated(updated: Organization) {
    onOrganizationUpdate(updated);
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconSettings className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>

      <div className={`${card} mt-6 p-5`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("logoHeading")}</h3>
        <div className="mt-4">
          <LogoUploader organization={current} onUpdated={handleUpdated} />
        </div>
      </div>

      <OrganizationDataForm organization={current} onUpdated={handleUpdated} />

      <LifecycleSection organization={current} onUpdated={handleUpdated} router={router} orgId={id} />

      <ApiKeysSection organizationId={id} />
    </div>
  );
}

function OrganizationDataForm({
  organization,
  onUpdated,
}: {
  organization: Organization;
  onUpdated: (organization: Organization) => void;
}) {
  const t = useTranslations("orgSettings");
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [tradeName, setTradeName] = useState(organization.trade_name ?? "");
  const [segment, setSegment] = useState(organization.segment ?? "");
  const [cnpj, setCnpj] = useState(organization.cnpj ?? "");
  const [notes, setNotes] = useState(organization.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.patch<Organization>(`/api/v1/organizations/${organization.id}`, {
        name,
        trade_name: tradeName || null,
        segment: segment || null,
        cnpj: cnpj || null,
        notes: notes || null,
      });
      onUpdated(updated);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return;
      }
      setError(err instanceof ApiError ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} mt-6 p-5`}>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("companyData")}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {t("name")}
          <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </label>
        <label className={labelClass}>
          {t("tradeName")}
          <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} className={input} />
        </label>
        <label className={labelClass}>
          {t("segment")}
          <input value={segment} onChange={(e) => setSegment(e.target.value)} className={input} />
        </label>
        <label className={labelClass}>
          {t("cnpj")}
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={input} />
        </label>
      </div>
      <label className={`${labelClass} mt-4`}>
        {t("notes")}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={`${input} resize-y`}
        />
      </label>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {saved && !error && (
        <div className="mt-4">
          <Alert tone="success">{t("dataSaved")}</Alert>
        </div>
      )}
      <button type="submit" disabled={saving} className={`${buttonPrimary} mt-4`}>
        {saving ? t("saving") : t("saveData")}
      </button>
    </form>
  );
}

function LifecycleSection({
  organization,
  onUpdated,
  router,
  orgId,
}: {
  organization: Organization;
  onUpdated: (organization: Organization) => void;
  router: ReturnType<typeof useRouter>;
  orgId: string;
}) {
  const t = useTranslations("orgSettings");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFreeze() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.post<Organization>(`/api/v1/organizations/${orgId}/freeze`, {
        reason: reason.trim() || undefined,
      });
      onUpdated(updated);
      setDialogOpen(false);
      setReason("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return;
      }
      setError(err instanceof ApiError ? err.message : t("freezeError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.post<Organization>(`/api/v1/organizations/${orgId}/reactivate`);
      onUpdated(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return;
      }
      setError(err instanceof ApiError ? err.message : t("reactivateError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${card} mt-6 p-5`}>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("lifecycle")}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {organization.status === "frozen" ? t("frozenDescription") : t("activeDescription")}
      </p>
      {error && !dialogOpen && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-4">
        {organization.status === "frozen" ? (
          <button type="button" onClick={() => void handleReactivate()} disabled={busy} className={buttonPrimary}>
            {busy ? t("reactivating") : t("reactivate")}
          </button>
        ) : (
          <button type="button" onClick={() => setDialogOpen(true)} className={buttonDanger}>
            {t("freeze")}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title={t("freezeDialogTitle")}
        description={t("freezeDialogDescription")}
        confirmLabel={t("freezeConfirmLabel")}
        tone="danger"
        confirming={busy}
        error={error}
        onConfirm={() => void handleFreeze()}
        onCancel={() => {
          setDialogOpen(false);
          setReason("");
        }}
      >
        <label className={labelClass}>
          {t("freezeReasonLabel")}
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("freezeReasonPlaceholder")}
            className={input}
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}
