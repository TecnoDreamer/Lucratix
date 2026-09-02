"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { buttonPrimary, card } from "@/lib/ui";
import { Alert } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { PasswordRequirementsChecklist } from "@/components/password-requirements-checklist";

/**
 * Seção "Senha" da Central de Configurações — front-end para
 * `POST /api/v1/auth/change-password` (o endpoint já existia e já era
 * testado, mas não tinha nenhuma tela; ver docs/security/POLITICA_DE_SENHAS.md).
 * Mesmo padrão visual das demais seções desta página (Aparência/Idioma/
 * Acessos Rápidos).
 *
 * Campo de senha ATUAL sem `minLength` de propósito: é uma senha já
 * existente, possivelmente anterior à política atual (legado nunca é
 * invalidado retroativamente) — só a senha NOVA precisa atender aos 4
 * requisitos, com o mesmo checklist em tempo real de `/register` e
 * `/redefinir-senha`.
 */
export function ChangePasswordCard() {
  const t = useTranslations("account.changePassword");
  const tCommon = useTranslations("common");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`${card} mt-6 p-5`}>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("title")}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <PasswordInput
          label={t("currentPasswordLabel")}
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <div>
          <PasswordInput
            label={t("newPasswordLabel")}
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordRequirementsChecklist password={newPassword} />
        </div>
        <PasswordInput
          label={t("confirmPasswordLabel")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          minLength={8}
        />

        {error && <Alert>{error}</Alert>}
        {success && <Alert tone="success">{t("successMessage")}</Alert>}

        <button type="submit" disabled={submitting} className={`${buttonPrimary} self-start`}>
          {submitting ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
