// Personalização de gráficos do Funil (redesign, 2026-09) — schema puro, sem
// UI. Cada gráfico só oferece as opções que fazem sentido pra ele (seção 9
// do prompt de redesign, "matriz de compatibilidade"): nenhum seletor de
// tipo de gráfico pra StageConversionChart, por exemplo — o layout
// horizontal foi a correção da PR1 pro problema de nomes inclinados,
// reoferecer o layout antigo reintroduziria o bug.
export type ChartDensity = "comfortable" | "compact";
export type FunnelChartType = "funnel" | "bars";
export type ChartPreset = "default" | "compact" | "analytical" | "presentation";

export const CHART_PRESETS: ChartPreset[] = ["default", "compact", "analytical", "presentation"];

export interface FunnelStagesChartSettings {
  chartType: FunnelChartType;
  showValues: boolean;
  density: ChartDensity;
}

export interface StageConversionChartSettings {
  showValues: boolean;
  density: ChartDensity;
}

export const DEFAULT_FUNNEL_STAGES_SETTINGS: FunnelStagesChartSettings = {
  chartType: "funnel",
  showValues: true,
  density: "comfortable",
};

export const DEFAULT_STAGE_CONVERSION_SETTINGS: StageConversionChartSettings = {
  showValues: true,
  density: "comfortable",
};

/** Fonte única da definição de cada preset — nunca duplicada entre código e
 * docs/charts/PERSONALIZACAO_DE_GRAFICOS.md (a doc descreve esta tabela em
 * prosa, não a reimplementa). Compacto só aperta espaço, nunca esconde dado.
 * Analítico troca o funil por barras (mais fácil comparar valores exatos).
 * Apresentação tira o texto secundário pra uma tela mais limpa, mantendo a
 * forma visual. */
export function funnelStagesSettingsForPreset(preset: ChartPreset): FunnelStagesChartSettings {
  switch (preset) {
    case "compact":
      return { chartType: "funnel", showValues: true, density: "compact" };
    case "analytical":
      return { chartType: "bars", showValues: true, density: "comfortable" };
    case "presentation":
      return { chartType: "funnel", showValues: false, density: "comfortable" };
    case "default":
    default:
      return DEFAULT_FUNNEL_STAGES_SETTINGS;
  }
}

export function stageConversionSettingsForPreset(preset: ChartPreset): StageConversionChartSettings {
  switch (preset) {
    case "compact":
      return { showValues: true, density: "compact" };
    case "analytical":
      return { showValues: true, density: "comfortable" };
    case "presentation":
      return { showValues: false, density: "comfortable" };
    case "default":
    default:
      return DEFAULT_STAGE_CONVERSION_SETTINGS;
  }
}
