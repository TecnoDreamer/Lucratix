"use client";

import { useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { buttonSecondary } from "@/lib/ui";
import { Alert } from "@/components/ui";
import { OrganizationLogo } from "@/components/organization-logo";
import type { Organization } from "@/lib/types";

/** Envio/troca/remoção de logotipo — mesmo padrão de `<input type="file">`
 * do wizard de importação (import-wizard.tsx), sem drag-and-drop. Preview
 * local (antes de enviar) usa `URL.createObjectURL`; depois do envio, o
 * componente passa a mostrar a `logo_url` de verdade vinda do backend. */
export function LogoUploader({
  organization,
  onUpdated,
}: {
  organization: Organization;
  onUpdated: (organization: Organization) => void;
}) {
  const t = useTranslations("orgSettings.logo");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setPendingFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      const updated = await api.postForm<Organization>(
        `/api/v1/organizations/${organization.id}/logo`,
        formData
      );
      onUpdated(updated);
      setPendingFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("uploadGenericError"));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    try {
      const updated = await api.del<Organization>(`/api/v1/organizations/${organization.id}/logo`);
      onUpdated(updated);
      setPendingFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("removeGenericError"));
    } finally {
      setRemoving(false);
    }
  }

  const displayLogoUrl = previewUrl ?? organization.logo_url;

  return (
    <div className="flex items-start gap-4">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:), next/image não aceita esse esquema
        <img
          src={previewUrl}
          alt={t("previewAlt")}
          className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-sm"
        />
      ) : (
        <OrganizationLogo logoUrl={displayLogoUrl} name={organization.name} size={64} />
      )}

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("formatHint")}</p>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          onChange={handleFileChange}
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-300 dark:file:bg-blue-500/10 dark:file:text-blue-300"
        />
        <div className="flex flex-wrap gap-2">
          {pendingFile && (
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading}
              className={`${buttonSecondary} text-sm`}
            >
              {uploading ? t("uploading") : t("save")}
            </button>
          )}
          {organization.logo_url && !pendingFile && (
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={removing}
              className={`${buttonSecondary} text-sm`}
            >
              {removing ? t("removing") : t("remove")}
            </button>
          )}
        </div>
        {error && <Alert>{error}</Alert>}
      </div>
    </div>
  );
}
