import { describe, expect, it } from "vitest";
import { computeExecutiveInsights } from "./insights";
import type { ExecutiveDashboard, MetricWithComparison } from "./metrics";

function metric(value: number | null, percentChange: number | null): MetricWithComparison {
  return {
    current: { value, is_applicable: value !== null, reason: value === null ? "dado ausente" : null },
    comparison: {
      baseline_value: null,
      current_value: value,
      absolute_change: null,
      percent_change: percentChange,
    },
  };
}

const BASE: ExecutiveDashboard = {
  date_from: "2026-08-01",
  date_to: "2026-08-31",
  previous_date_from: "2026-07-01",
  previous_date_to: "2026-07-31",
  months_in_range: 1,
  months_with_financial_data: 1,
  months_with_funnel_data: 1,
  revenue: metric(58200, 0.05),
  profit: metric(20900, 0.03),
  margin: metric(0.359, 0.01),
  cac: metric(133.33, 0.02),
  conversion_rate: metric(0.07, 0.01),
  average_ticket: metric(923.81, 0.01),
  recurrence_rate: metric(0.333, 0.01),
};

describe("computeExecutiveInsights", () => {
  it("sem nenhuma comparação aplicável, não gera insight nenhum", () => {
    const dashboard: ExecutiveDashboard = {
      ...BASE,
      revenue: metric(null, null),
      profit: metric(null, null),
      margin: metric(null, null),
      cac: metric(null, null),
      conversion_rate: metric(null, null),
      average_ticket: metric(null, null),
      recurrence_rate: metric(null, null),
    };
    expect(computeExecutiveInsights(dashboard)).toEqual([]);
  });

  it("aponta o KPI de maior variação absoluta do período", () => {
    const dashboard: ExecutiveDashboard = {
      ...BASE,
      revenue: metric(58200, 0.05),
      cac: metric(133.33, -0.417), // maior |variação|
    };
    const insights = computeExecutiveInsights(dashboard);
    const biggest = insights.find((i) => i.id === "biggest-mover");
    expect(biggest?.text).toContain("Custo de Aquisição de Cliente");
    expect(biggest?.text).toContain("-41,7%");
  });

  it("maior variação de uma métrica lower_is_better que caiu é tom positivo", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, cac: metric(133.33, -0.417) };
    const biggest = computeExecutiveInsights(dashboard).find((i) => i.id === "biggest-mover");
    expect(biggest?.tone).toBe("positive");
  });

  it("maior variação de uma métrica lower_is_better que subiu é tom negativo", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, cac: metric(200, 0.417) };
    const biggest = computeExecutiveInsights(dashboard).find((i) => i.id === "biggest-mover");
    expect(biggest?.tone).toBe("negative");
  });

  it("receita subiu e CAC caiu no mesmo período: insight positivo dedicado", () => {
    const dashboard: ExecutiveDashboard = {
      ...BASE,
      revenue: metric(58200, 0.124),
      cac: metric(100, -0.1),
    };
    const insight = computeExecutiveInsights(dashboard).find((i) => i.id === "revenue-up-cac-down");
    expect(insight?.tone).toBe("positive");
    expect(insight?.text).toContain("+12,4%");
    expect(insight?.text).toContain("10%");
  });

  it("receita subiu e CAC também subiu: não gera o insight de combinação", () => {
    const dashboard: ExecutiveDashboard = {
      ...BASE,
      revenue: metric(58200, 0.124),
      cac: metric(200, 0.05),
    };
    expect(computeExecutiveInsights(dashboard).find((i) => i.id === "revenue-up-cac-down")).toBeUndefined();
  });

  it("receita subiu mas margem caiu: insight de alerta, sem afirmar causa", () => {
    const dashboard: ExecutiveDashboard = {
      ...BASE,
      revenue: metric(58200, 0.124),
      margin: metric(0.3, -0.05),
    };
    const insight = computeExecutiveInsights(dashboard).find((i) => i.id === "revenue-up-margin-down");
    expect(insight?.tone).toBe("negative");
    expect(insight?.text).not.toMatch(/porque|causad[ao]|devido/i);
  });

  it("nunca gera mais de 3 insights", () => {
    const dashboard: ExecutiveDashboard = {
      ...BASE,
      revenue: metric(58200, 0.124),
      cac: metric(100, -0.1),
      margin: metric(0.3, -0.3), // maior |variação| + combinação de alerta
    };
    expect(computeExecutiveInsights(dashboard).length).toBeLessThanOrEqual(3);
  });
});
