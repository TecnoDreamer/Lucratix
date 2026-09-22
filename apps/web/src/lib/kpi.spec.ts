import { describe, expect, it } from "vitest";
import { comparisonToneClass, getComparisonTone } from "@/lib/kpi";
import type { PeriodComparison } from "@/lib/metrics";

function comparison(percent_change: number | null): PeriodComparison {
  return { baseline_value: null, current_value: null, absolute_change: null, percent_change };
}

describe("getComparisonTone", () => {
  it("null quando não há comparação (RN-003) — nunca vira 'estável'", () => {
    expect(getComparisonTone("revenue", comparison(null))).toBeNull();
  });

  it("zero é 'neutral', não 'positive' nem 'negative'", () => {
    expect(getComparisonTone("revenue", comparison(0))).toBe("neutral");
  });

  it("receita (higher_is_better): subir é positivo", () => {
    expect(getComparisonTone("revenue", comparison(0.1))).toBe("positive");
  });

  it("receita (higher_is_better): cair é negativo", () => {
    expect(getComparisonTone("revenue", comparison(-0.1))).toBe("negative");
  });

  it("CAC (lower_is_better): subir é negativo — nunca pintar de bom só porque o número aumentou", () => {
    expect(getComparisonTone("cac", comparison(0.1))).toBe("negative");
  });

  it("CAC (lower_is_better): cair é positivo", () => {
    expect(getComparisonTone("cac", comparison(-0.1))).toBe("positive");
  });
});

describe("comparisonToneClass", () => {
  it("cada tom tem uma classe de cor distinta", () => {
    const classes = new Set([
      comparisonToneClass("positive"),
      comparisonToneClass("negative"),
      comparisonToneClass("neutral"),
    ]);
    expect(classes.size).toBe(3);
  });
});
