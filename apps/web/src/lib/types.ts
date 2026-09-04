export type MembershipRole = "ORGANIZATION_OWNER" | "ORGANIZATION_ADMIN" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  name: string;
  email: string;
  is_platform_admin: boolean;
  email_verified: boolean;
  locale: string | null;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: MembershipRole;
  status: "active" | "pending";
  created_at: string;
  user_name: string;
  user_email: string;
  // Só preenchido na resposta de criação (POST), quando a conta acabou de
  // ser criada e fora de produção — mesmo padrão de dev_token do restante
  // da plataforma (ver lib/api.ts e as telas de esqueci-senha/redefinir-senha).
  dev_token?: string | null;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  created_by_user_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

// Só existe na resposta de criação (POST) — o único momento em que o valor
// bruto existe fora do banco (que só guarda o hash). Nunca devolvido de
// novo por nenhum outro endpoint.
export interface ApiKeyCreated extends ApiKey {
  raw_key: string;
}

export type OrganizationStatus = "active" | "frozen";

export interface Organization {
  id: string;
  name: string;
  trade_name: string | null;
  segment: string | null;
  cnpj: string | null;
  currency: string;
  timezone: string;
  tracking_start_date: string | null;
  notes: string | null;
  created_at: string;
  status: OrganizationStatus;
  closed_at: string | null;
  closure_reason: string | null;
  logo_url: string | null;
  my_role: MembershipRole | null;
}

// Página de resultados de GET /organizations (busca + paginação
// server-side, 2026-09-01) — antes devolvia sempre a lista inteira do
// usuário, sem filtro nenhum.
export interface OrganizationPage {
  items: Organization[];
  total: number;
  limit: number;
  offset: number;
}

export interface Baseline {
  id: string;
  organization_id: string;
  created_by: string | null;
  revenue: number | null;
  profit: number | null;
  margin: number | null;
  customer_count: number | null;
  cac: number | null;
  conversion_rate: number | null;
  average_ticket: number | null;
  marketing_investment: number | null;
  leads: number | null;
  recurrence_rate: number | null;
  notes: string | null;
  created_at: string;
}
