import { useCallback, useEffect, useState } from "react";
import { fetchWorkspacePreferences, type QuickAccessPreferenceItem } from "@/lib/workspace-preferences";

export interface UseWorkspacePreferencesResult {
  quickAccess: QuickAccessPreferenceItem[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Busca a preferência de acessos rápidos da organização. Uma falha
 * (incluindo 401) nunca esconde a seção de acesso rápido — `quickAccess`
 * simplesmente permanece `null`, o que `resolveQuickAccess` já trata como
 * "usar o padrão". Diferente de outros hooks da página (`useDashboard`, o
 * carregamento de baselines), este NUNCA redireciona para /login sozinho —
 * as outras chamadas da mesma página já cuidam disso; duplicar o redirect
 * aqui só correria risco de disparar duas navegações para a mesma falha. */
export function useWorkspacePreferences(
  organizationId: string | undefined
): UseWorkspacePreferencesResult {
  const [quickAccess, setQuickAccess] = useState<QuickAccessPreferenceItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!organizationId) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setQuickAccess(null);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });

    fetchWorkspacePreferences(organizationId)
      .then((prefs) => {
        if (!cancelled) setQuickAccess(prefs.quick_access);
      })
      .catch(() => {
        if (!cancelled) {
          setQuickAccess(null);
          setError("Não foi possível carregar suas preferências de acesso rápido.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { quickAccess, loading, error, reload };
}
