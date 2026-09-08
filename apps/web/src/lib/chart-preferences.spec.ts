import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import {
  saveFunnelStagesPreferences,
  saveStageConversionPreferences,
  sanitizeFunnelStagesSettings,
  sanitizeStageConversionSettings,
} from "./chart-preferences";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, patch: vi.fn() } };
});

afterEach(() => {
  vi.mocked(api.patch).mockReset();
});

describe("sanitizeFunnelStagesSettings", () => {
  it("forma válida passa e converte pro formato interno (camelCase)", () => {
    expect(
      sanitizeFunnelStagesSettings({ chart_type: "bars", show_values: true, density: "compact" })
    ).toEqual({ chartType: "bars", showValues: true, density: "compact" });
  });

  it("chart_type fora do union cai pra null", () => {
    expect(
      sanitizeFunnelStagesSettings({ chart_type: "pizza", show_values: true, density: "compact" })
    ).toBeNull();
  });

  it("density fora do union cai pra null", () => {
    expect(
      sanitizeFunnelStagesSettings({ chart_type: "funnel", show_values: true, density: "media" })
    ).toBeNull();
  });

  it("show_values com tipo errado cai pra null", () => {
    expect(
      sanitizeFunnelStagesSettings({ chart_type: "funnel", show_values: "sim", density: "compact" })
    ).toBeNull();
  });

  it("campo faltando cai pra null", () => {
    expect(sanitizeFunnelStagesSettings({ chart_type: "funnel", show_values: true })).toBeNull();
  });

  it("null, undefined ou tipo primitivo caem pra null (schema_version desconhecido inclusive)", () => {
    expect(sanitizeFunnelStagesSettings(null)).toBeNull();
    expect(sanitizeFunnelStagesSettings(undefined)).toBeNull();
    expect(sanitizeFunnelStagesSettings("qualquer coisa")).toBeNull();
  });
});

describe("sanitizeStageConversionSettings", () => {
  it("forma válida passa e converte pro formato interno", () => {
    expect(sanitizeStageConversionSettings({ show_values: false, density: "comfortable" })).toEqual(
      { showValues: false, density: "comfortable" }
    );
  });

  it("density fora do union cai pra null", () => {
    expect(sanitizeStageConversionSettings({ show_values: true, density: "media" })).toBeNull();
  });

  it("não aceita chart_type (campo não existe pra este gráfico) — ignorado, não invalida", () => {
    expect(
      sanitizeStageConversionSettings({ show_values: true, density: "compact", chart_type: "bars" })
    ).toEqual({ showValues: true, density: "compact" });
  });
});

describe("saveFunnelStagesPreferences / saveStageConversionPreferences", () => {
  it("converte o formato interno (camelCase) pro formato de rede (snake_case)", async () => {
    vi.mocked(api.patch).mockResolvedValue({
      organization_id: "org-1",
      chart_key: "funnel-stages",
      preferences: {},
      updated_at: null,
    });

    await saveFunnelStagesPreferences("org-1", {
      chartType: "bars",
      showValues: false,
      density: "compact",
    });

    expect(api.patch).toHaveBeenCalledWith(
      "/api/v1/organizations/org-1/chart-preferences/funnel-stages",
      { preferences: { chart_type: "bars", show_values: false, density: "compact" } }
    );
  });

  it("stage-conversion não manda chart_type (o gráfico não tem essa opção)", async () => {
    vi.mocked(api.patch).mockResolvedValue({
      organization_id: "org-1",
      chart_key: "stage-conversion",
      preferences: {},
      updated_at: null,
    });

    await saveStageConversionPreferences("org-1", { showValues: true, density: "comfortable" });

    expect(api.patch).toHaveBeenCalledWith(
      "/api/v1/organizations/org-1/chart-preferences/stage-conversion",
      { preferences: { show_values: true, density: "comfortable" } }
    );
  });
});
