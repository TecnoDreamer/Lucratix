import { api } from "@/lib/api";

export interface QuickAccessPreferenceItem {
  id: string;
  enabled: boolean;
}

export interface WorkspacePreferences {
  organization_id: string;
  quick_access: QuickAccessPreferenceItem[] | null;
  updated_at: string | null;
}

export function fetchWorkspacePreferences(organizationId: string): Promise<WorkspacePreferences> {
  return api.get<WorkspacePreferences>(
    `/api/v1/organizations/${organizationId}/workspace-preferences`
  );
}

export function saveQuickAccess(
  organizationId: string,
  items: QuickAccessPreferenceItem[]
): Promise<WorkspacePreferences> {
  return api.patch<WorkspacePreferences>(
    `/api/v1/organizations/${organizationId}/workspace-preferences`,
    { quick_access: items }
  );
}

/** "Restaurar padrão" grava `null`, não a lista padrão atual — assim um card
 * novo adicionado numa versão futura aparece automaticamente para quem já
 * restaurou (ver docstring do model no backend). */
export function restoreQuickAccessDefaults(organizationId: string): Promise<WorkspacePreferences> {
  return api.patch<WorkspacePreferences>(
    `/api/v1/organizations/${organizationId}/workspace-preferences`,
    { quick_access: null }
  );
}
