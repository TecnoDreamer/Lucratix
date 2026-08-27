import { useEffect, useState } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import type { Dashboard, PeriodComparison } from "@/lib/metrics";
import { useRouter } from "next/navigation";

// Extraído de organizations/[id]/dashboard/page.tsx para ser reutilizado
// também pela página inicial da empresa (organizations/[id]/page.tsx) —
// PARTE 5 do prompt de redesign de UX (2026-08-27): "se esses indicadores já
// existirem no dashboard atual, reutilizar os mesmos serviços, hooks e APIs.
// Não duplicar chamadas." Cada página que monta o hook ainda faz sua própria
// requisição (são rotas/montagens diferentes, não há como uma única chamada
// de rede servir as duas ao mesmo tempo), mas a LÓGICA de busca fica em um
// só lugar em vez de duplicada.
async function fetchRevenueComparison(id: string, period: string): Promise<PeriodComparison | null> {
  try {
    return await api.get<PeriodComparison>(
      `/api/v1/organizations/${id}/dashboard/compare-to-baseline?period=${period}&metric=revenue`
    );
  } catch (err) {
    // Sem baseline registrado ainda: comparacao fica indisponivel, painel segue funcional.
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface UseDashboardResult {
  dashboard: Dashboard | null;
  revenueComparison: PeriodComparison | null;
  loading: boolean;
  error: string | null;
}

export function useDashboard(id: string, period: string): UseDashboardResult {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [revenueComparison, setRevenueComparison] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    async function load() {
      // Independentes entre si: rodam em paralelo em vez de em fila.
      const [dash, comparison] = await Promise.all([
        api.get<Dashboard>(`/api/v1/organizations/${id}/dashboard?period=${period}`),
        fetchRevenueComparison(id, period),
      ]);
      return { dash, comparison };
    }

    load()
      .then(({ dash, comparison }) => {
        if (cancelled) return;
        setDashboard(dash);
        setRevenueComparison(comparison);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
          return;
        }
        setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, period]);

  return { dashboard, revenueComparison, loading, error };
}
