import { useState } from "react";
import { CHART_PRESETS, type ChartPreset } from "@/lib/chart-settings";

/** Qual preset (se algum) o valor atual corresponde — pra reabrir o dialog
 * já com o preset certo destacado, em vez de sempre voltar pra "Padrão"
 * mesmo quando o que está de fato aplicado é "Analítico". Sem
 * correspondência exata (usuário mexeu num controle avulso depois de
 * escolher um preset) cai em "default" — mais neutro que não destacar
 * nenhum, já que o `SegmentedControl` sempre precisa de um valor ativo. */
function matchingPreset<T>(value: T, settingsForPreset: (preset: ChartPreset) => T): ChartPreset {
  return CHART_PRESETS.find((p) => JSON.stringify(settingsForPreset(p)) === JSON.stringify(value)) ?? "default";
}

/** Estado de personalização de UM gráfico (redesign do Funil, PR2) — usado
 * duas vezes na mesma tela (`FunnelStagesChart`/`StageConversionChart`),
 * daí valer a pena extrair em vez de duplicar. Encapsula o fluxo
 * preview→aplicar→cancelar→restaurar padrão da seção 11 do prompt de
 * redesign: `applied` é o que de fato renderiza; `draft` só existe com o
 * dialog aberto, e é o que o gráfico por trás do dialog também usa
 * enquanto ele preview (preview ao vivo, não uma miniatura separada).
 * Sem persistência ainda (PR3) — `applied` é só estado de sessão, some ao
 * recarregar a página. */
export function useChartSettings<T>(settingsForPreset: (preset: ChartPreset) => T) {
  const [applied, setApplied] = useState<T>(() => settingsForPreset("default"));
  const [draft, setDraft] = useState<T | null>(null);
  const [preset, setPreset] = useState<ChartPreset>("default");

  function open() {
    setDraft(applied);
    setPreset(matchingPreset(applied, settingsForPreset));
  }

  function changePreset(next: ChartPreset) {
    setPreset(next);
    setDraft(settingsForPreset(next));
  }

  function apply() {
    if (draft) setApplied(draft);
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
