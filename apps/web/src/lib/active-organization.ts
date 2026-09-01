import type { Organization } from "@/lib/types";

// Usado para lembrar em qual empresa o usuario estava, e resolver o "Voltar"
// de Configurações para a Home da empresa certa em vez de sempre "Suas
// empresas" (ver app/conta/layout.tsx). Cache de conveniencia apenas — nunca
// a unica fonte da verdade: sempre validado contra a lista real de
// organizacoes do usuario antes de virar um link (ver resolveActiveOrganization).
export const ACTIVE_ORGANIZATION_STORAGE_KEY = "lucratix.active-organization-id";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOrganizationId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function readStoredActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  } catch {
    // localStorage indisponivel (modo privado, etc.) — mesmo padrao de theme.ts.
    return null;
  }
}

export function rememberActiveOrganizationId(id: string): void {
  try {
    window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, id);
  } catch {
    // Sem persistencia entre sessoes; o "?from=" na URL ainda cobre a sessao atual.
  }
}

export function forgetActiveOrganizationId(): void {
  try {
    window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  } catch {
    // Nada a fazer.
  }
}

/** Resolve a empresa ativa a partir de `?from=<orgId>` (prioridade) ou do
 * ultimo id lembrado em localStorage — sempre validando contra a lista REAL
 * de organizacoes do usuario (que ja vem filtrada por membership do
 * backend). Um id que o usuario nao pertence nunca bate no `.find` e nunca
 * vira link — e assim que evitamos cross-tenant leak/open redirect sem
 * precisar buscar `fromParam` na API (o que criaria um oraculo de
 * existencia de organizacao). */
export function resolveActiveOrganization(
  organizations: Organization[],
  fromParam: string | null
): Organization | null {
  const candidate = isOrganizationId(fromParam) ? fromParam : readStoredActiveOrganizationId();
  if (!candidate) return null;
  return organizations.find((o) => o.id === candidate) ?? null;
}

export function accountBackTarget(active: Organization | null): { href: string; label: string } {
  if (active) {
    return { href: `/organizations/${active.id}`, label: `Voltar para ${active.name}` };
  }
  return { href: "/organizations", label: "Suas empresas" };
}
