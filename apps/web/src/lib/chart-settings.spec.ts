import { describe, expect, it } from "vitest";
import {
  DEFAULT_FUNNEL_STAGES_SETTINGS,
  DEFAULT_STAGE_CONVERSION_SETTINGS,
  funnelStagesSettingsForPreset,
  stageConversionSettingsForPreset,
} from "./chart-settings";

describe("funnelStagesSettingsForPreset", () => {
  it("default é funil, valores visíveis, confortável", () => {
    expect(funnelStagesSettingsForPreset("default")).toEqual(DEFAULT_FUNNEL_STAGES_SETTINGS);
  });

  it("compacto mantém funil e valores, só aperta a densidade", () => {
    expect(funnelStagesSettingsForPreset("compact")).toEqual({
      chartType: "funnel",
      showValues: true,
      density: "compact",
    });
  });

  it("analítico troca pra barras, mantém valores e densidade confortável", () => {
    expect(funnelStagesSettingsForPreset("analytical")).toEqual({
      chartType: "bars",
      showValues: true,
      density: "comfortable",
    });
  });

  it("apresentação esconde os valores, mantém o funil", () => {
    expect(funnelStagesSettingsForPreset("presentation")).toEqual({
      chartType: "funnel",
      showValues: false,
      density: "comfortable",
    });
  });
});

describe("stageConversionSettingsForPreset", () => {
  it("default é valores visíveis, confortável", () => {
    expect(stageConversionSettingsForPreset("default")).toEqual(DEFAULT_STAGE_CONVERSION_SETTINGS);
  });

  it("compacto aperta a densidade sem esconder valores", () => {
    expect(stageConversionSettingsForPreset("compact")).toEqual({ showValues: true, density: "compact" });
  });

  it("analítico é igual ao default para este gráfico (sem seletor de tipo)", () => {
    expect(stageConversionSettingsForPreset("analytical")).toEqual({ showValues: true, density: "comfortable" });
  });

  it("apresentação esconde os valores", () => {
    expect(stageConversionSettingsForPreset("presentation")).toEqual({ showValues: false, density: "comfortable" });
  });
});
