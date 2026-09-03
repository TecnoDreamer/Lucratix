import { describe, expect, it } from "vitest";
import { computeFunnelInsights, findBottleneck } from "./funnel-insights";
import type { StageConversionWithComparison } from "./funnel-metrics";
import type { MetricResult } from "./metrics";

const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });
const notApplicable: MetricResult = { value: null, is_applicable: false, reason: "dado ausente: conversions" };

function conversion(
  from: string,
  to: string,
  rate: MetricResult,
  percentChange: number | null,
  baselineValue: number | null = null
): StageConversionWithComparison {
  return {
    from_stage: from as StageConversionWithComparison["from_stage"],
    to_stage: to as StageConversionWithComparison["to_stage"],
    conversion_rate: rate,
    drop_off_rate: rate.is_applicable ? applicable(1 - rate.value!) : notApplicable,
    conversion_rate_comparison: {
      baseline_value: baselineValue,
      current_value: rate.value,
      absolute_change: baselineValue !== null && rate.value !== null ? rate.value - baselineValue : null,
      percent_change: percentChange,
    },
  };
}

describe("findBottleneck", () => {
  it("acha a menor conversao aplicavel entre varias", () => {
    const conversions = [
      conversion("leads", "mqls", applicable(0.6), null),
      conversion("mqls", "sqls", applicable(0.2), null),
      conversion("sqls", "opportunities", applicable(0.5), null),
    ];
    const bottleneck = findBottleneck(conversions);
    expect(bottleneck?.from_stage).toBe("mqls");
    expect(bottleneck?.to_stage).toBe("sqls");
  });

  it("ignora conversoes nao aplicaveis", () => {
    const conversions = [
      conversion("leads", "mqls", notApplicable, null),
      conversion("mqls", "sqls", applicable(0.3), null),
    ];
    expect(findBottleneck(conversions)?.from_stage).toBe("mqls");
  });

  it("retorna null quando nenhuma conversao e aplicavel", () => {
    expect(findBottleneck([conversion("leads", "mqls", notApplicable, null)])).toBeNull();
  });
});

describe("computeFunnelInsights", () => {
  it("aponta o gargalo (menor conversao aplicavel)", () => {
    const conversions = [
      conversion("leads", "mqls", applicable(0.6), null),
      conversion("mqls", "sqls", applicable(0.2), null),
    ];
    const insights = computeFunnelInsights(conversions);
    const bottleneckInsight = insights.find((i) => i.id === "funnel-bottleneck");
    expect(bottleneckInsight?.text).toContain("MQLs");
    expect(bottleneckInsight?.text).toContain("SQLs");
    expect(bottleneckInsight?.text).toContain("20%");
  });

  it("aponta a maior variacao de conversao vs. periodo anterior", () => {
    const conversions = [
      conversion("leads", "mqls", applicable(0.6), 0.5, 0.4),
      conversion("mqls", "sqls", applicable(0.2), -0.1, 0.22),
    ];
    const insights = computeFunnelInsights(conversions);
    const biggestMover = insights.find((i) => i.id === "funnel-biggest-mover");
    expect(biggestMover?.text).toContain("Leads");
    expect(biggestMover?.text).toContain("MQLs");
    expect(biggestMover?.tone).toBe("positive");
  });

  it("sem nenhuma conversao aplicavel, nao gera nenhum insight", () => {
    const conversions = [conversion("leads", "mqls", notApplicable, null)];
    expect(computeFunnelInsights(conversions)).toEqual([]);
  });
});
