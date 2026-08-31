// Tipos do painel de Super Admin (`/admin`) — espelham
// app/schemas/platform_admin.py. Só usados por telas atrás de
// `is_platform_admin` (ver admin/layout.tsx).

export interface PlatformOrganization {
  id: string;
  name: string;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
  member_count: number;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_platform_admin: boolean;
  organization_count: number;
}

export interface PlatformUserCreateResponse {
  user: PlatformUser;
  dev_token: string | null;
}
