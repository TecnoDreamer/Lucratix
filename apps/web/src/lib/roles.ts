import { useTranslations } from "next-intl";
import type { MembershipRole } from "@/lib/types";

// Rótulo amigável para exibição — nunca usado como valor enviado à API nem
// como critério de decisão de permissão (isso continua sendo o enum bruto,
// MembershipRole). Ver seção "Correspondência com o mundo real" do prompt
// de redesign de UX (2026-08-27): trocar nomes internos por labels amigáveis
// apenas na camada de apresentação.
//
// Hook (não função pura) desde a i18n (2026-09-01): o rótulo depende do
// idioma da UI, que só é lido via contexto do next-intl dentro de um
// componente. `canPerformActions`/`hasMinimumRole` abaixo continuam funções
// puras — RBAC não tem string nenhuma, não precisa de hook.
export function useRoleLabel(): (role: MembershipRole | null | undefined) => string | null {
  const t = useTranslations("roles");
  return (role) => {
    if (!role) return null;
    switch (role) {
      case "ORGANIZATION_OWNER":
        return t("owner");
      case "ORGANIZATION_ADMIN":
        return t("admin");
      case "ANALYST":
        return t("analyst");
      case "VIEWER":
        return t("viewer");
      default:
        return role;
    }
  };
}

// RN-010 (ver docs/requirements/business-rules.md): VIEWER é somente
// leitura — não deve receber atalhos para ações que mutam dado (criar
// campanha, registrar baseline etc.).
export function canPerformActions(role: MembershipRole | null | undefined): boolean {
  return role != null && role !== "VIEWER";
}

// Espelha ROLE_HIERARCHY/role_rank de apps/api/app/models/membership.py
// (RN-009) — menor número = mais privilégio. Usado só para decidir o que
// mostrar na UI (esconder um item de navegação que o usuário não pode
// abrir); a autorização de verdade continua sendo decidida pelo backend via
// `require_role`, nunca por este valor.
const ROLE_RANK: Record<MembershipRole, number> = {
  ORGANIZATION_OWNER: 0,
  ORGANIZATION_ADMIN: 1,
  ANALYST: 2,
  VIEWER: 3,
};

export function hasMinimumRole(
  role: MembershipRole | null | undefined,
  minimumRole: MembershipRole
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] <= ROLE_RANK[minimumRole];
}
