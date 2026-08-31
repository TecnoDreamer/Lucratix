export type MembershipRole = "ORGANIZATION_OWNER" | "ORGANIZATION_ADMIN" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  name: string;
  email: string;
  is_platform_admin: boolean;
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
  my_role: MembershipRole | null;
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
