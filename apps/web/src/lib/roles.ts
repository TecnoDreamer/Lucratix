import type { MembershipRole } from "@/lib/types";

// Rótulo amigável para exibição — nunca usado como valor enviado à API nem
// como critério de decisão de permissão (isso continua sendo o enum bruto,
// MembershipRole). Ver seção "Correspondência com o mundo real" do prompt
// de redesign de UX (2026-08-27): trocar nomes internos por labels amigáveis
// apenas na camada de apresentação.
export const ROLE_LABELS: Record<MembershipRole, string> = {
  ORGANIZATION_OWNER: "Proprietário",
  ORGANIZATION_ADMIN: "Administrador",
  ANALYST: "Analista",
  VIEWER: "Visualizador",
};

export function roleLabel(role: MembershipRole | null | undefined): string | null {
  if (!role) return null;
  return ROLE_LABELS[role] ?? role;
}

// RN-010 (ver docs/requirements/business-rules.md): VIEWER é somente
// leitura — não deve receber atalhos para ações que mutam dado (criar
// campanha, registrar baseline etc.).
export function canPerformActions(role: MembershipRole | null | undefined): boolean {
  return role != null && role !== "VIEWER";
}
