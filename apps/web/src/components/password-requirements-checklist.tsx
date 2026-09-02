"use client";

import { useTranslations } from "next-intl";
import {
  checkPasswordRequirements,
  PASSWORD_REQUIREMENTS,
  type PasswordRequirementKey,
} from "@/lib/password-policy";
import { IconCheckCircle, IconX } from "@/components/icons";

/**
 * Checklist de requisitos de senha em tempo real (seção 4 do prompt de
 * política de senha) — usado em `register/page.tsx` e
 * `redefinir-senha/page.tsx` (qualquer tela que define uma senha NOVA;
 * nunca no campo de senha atual). Nunca comunica atendido/não-atendido só
 * por cor: cada item tem ícone (✓/✗) + texto, e o resumo em `aria-live` no
 * topo evita que leitor de tela precise reler a lista inteira a cada tecla.
 *
 * Fonte da verdade dos requisitos: `lib/password-policy.ts` (espelha
 * `app/core/password_policy.py` do backend — que é sempre a autoridade
 * de verdade; isto aqui é só feedback visual).
 */
export function PasswordRequirementsChecklist({ password }: { password: string }) {
  const t = useTranslations("common.passwordRequirements");
  const status = checkPasswordRequirements(password);
  const metCount = PASSWORD_REQUIREMENTS.filter((key) => status[key]).length;

  const labels: Record<PasswordRequirementKey, string> = {
    minLength: t("minLength"),
    uppercase: t("uppercase"),
    specialCharacter: t("specialCharacter"),
    minNumbers: t("minNumbers"),
  };

  return (
    <div>
      <p className="sr-only" aria-live="polite" role="status">
        {t("metCount", { met: metCount, total: PASSWORD_REQUIREMENTS.length })}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {PASSWORD_REQUIREMENTS.map((key) => {
          const met = status[key];
          const Icon = met ? IconCheckCircle : IconX;
          return (
            <li
              key={key}
              className={`flex items-center gap-1.5 text-xs ${
                met
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {labels[key]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
