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
