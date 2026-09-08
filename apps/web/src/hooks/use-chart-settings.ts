import { useEffect, useRef, useState } from "react";
import { CHART_PRESETS, type ChartPreset } from "@/lib/chart-settings";
import { fetchChartPreferences, type ChartKey } from "@/lib/chart-preferences";

/** Qual preset (se algum) o valor atual corresponde — pra reabrir o dialog
 * já com o preset certo destacado, em vez de sempre voltar pra "Padrão"
 * mesmo quando o que está de fato aplicado é "Analítico". Sem
 * correspondência exata (usuário mexeu num controle avulso depois de
 * escolher um preset) cai em "default" — mais neutro que não destacar
 * nenhum, já que o `SegmentedControl` sempre precisa de um valor ativo. */
function matchingPreset<T>(value: T, settingsForPreset: (preset: ChartPreset) => T): ChartPreset {
  return CHART_PRESETS.find((p) => JSON.stringify(settingsForPreset(p)) === JSON.stringify(value)) ?? "default";
}

/** Opcional (PR3): quando presente, a preferência é carregada do backend no
 * mount e `apply()` salva a nova preferência lá — melhor esforço, ver
 * `apply` abaixo. `sanitize` nunca deixa um valor de forma inesperada (ex.:
 * `schema_version` futuro que este cliente não entende) chegar ao gráfico:
 * retorna `null` nesse caso, e o hook mantém o preset "default" que já
 * tinha aplicado localmente (seção 12 do prompt de redesign). */
export interface ChartSettingsPersistence<T> {
  organizationId: string;
  chartKey: ChartKey;
  sanitize: (raw: unknown) => T | null;
  save: (organizationId: string, settings: T) => Promise<unknown>;
}

/** Estado de personalização de UM gráfico (redesign do Funil, PR2/PR3) —
 * usado duas vezes na mesma tela (`FunnelStagesChart`/`StageConversionChart`),
 * daí valer a pena extrair em vez de duplicar. Encapsula o fluxo
 * preview→aplicar→cancelar→restaurar padrão da seção 11 do prompt de
 * redesign: `applied` é o que de fato renderiza; `draft` só existe com o
 * dialog aberto, e é o que o gráfico por trás do dialog também usa
 * enquanto ele preview (preview ao vivo, não uma miniatura separada).
 * Sem `persistence`, `applied` é só estado de sessão (some ao recarregar a
 * página) — comportamento idêntico ao de antes da PR3. */
export function useChartSettings<T>(
  settingsForPreset: (preset: ChartPreset) => T,
  persistence?: ChartSettingsPersistence<T>
) {
  const [applied, setApplied] = useState<T>(() => settingsForPreset("default"));
  const [draft, setDraft] = useState<T | null>(null);
  const [preset, setPreset] = useState<ChartPreset>("default");
  // A preferência salva chega de forma assíncrona (efeito abaixo); `apply()`
  // roda bem depois, então precisa da referência mais recente sem virar
  // dependência do próprio efeito (senão recarregaria a preferência salva a
  // cada `apply`, sobrescrevendo o rascunho local com o que já está no
  // servidor — sem efeito prático, mas uma requisição desperdiçada).
  const persistenceRef = useRef(persistence);
  useEffect(() => {
    persistenceRef.current = persistence;
  });

  useEffect(() => {
    if (!persistence) return;
    let cancelled = false;
    fetchChartPreferences(persistence.organizationId, persistence.chartKey)
      .then((resp) => {
        if (cancelled || resp.preferences === null) return;
        const sanitized = persistence.sanitize(resp.preferences);
        // `null`: preferência salva em formato que este cliente não
        // reconhece (schema mudou) — mantém o "default" já aplicado em vez
        // de arriscar repassar algo inválido pro Recharts.
        if (sanitized === null) return;
        setApplied(sanitized);
        setPreset(matchingPreset(sanitized, settingsForPreset));
      })
      .catch(() => {
        // Falha ao carregar (rede, 401 etc.): mantém o preset "default" já
        // aplicado localmente — mesma tolerância de use-workspace-preferences.ts.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistence?.organizationId, persistence?.chartKey]);

  function open() {
    setDraft(applied);
    setPreset(matchingPreset(applied, settingsForPreset));
  }

  function changePreset(next: ChartPreset) {
    setPreset(next);
    setDraft(settingsForPreset(next));
  }

  function apply() {
    if (draft) {
      setApplied(draft);
      // Melhor esforço: o preview já aplicou localmente, uma falha de rede
      // aqui não deveria travar a UI nem desfazer a personalização — só a
      // persistência entre sessões fica pra próxima vez.
      persistenceRef.current?.save(persistenceRef.current.organizationId, draft).catch(() => {});
    }
    setDraft(null);
  }

  function cancel() {
    setDraft(null);
  }

  function reset() {
    setPreset("default");
    setDraft(settingsForPreset("default"));
  }

  return {
    /** O que o gráfico deve renderizar agora (rascunho, se o dialog estiver
     * aberto; aplicado, caso contrário). */
    active: draft ?? applied,
    isOpen: draft !== null,
    preset,
    draft,
    open,
    changePreset,
    apply,
    cancel,
    reset,
    /** Atualiza um campo do rascunho sem trocar de preset (ex.: usuário
     * mexeu num toggle específico depois de escolher um preset como ponto
     * de partida). */
    updateDraft: (updater: (current: T) => T) => setDraft((current) => (current ? updater(current) : current)),
  };
}
