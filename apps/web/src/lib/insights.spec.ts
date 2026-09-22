import { describe, expect, it } from "vitest";
import { computeExecutiveInsights, type ExecutiveInsightCopy } from "./insights";
import type { ExecutiveDashboard, ExecutiveTargets, MetricWithComparison, TargetMetricKey } from "./metrics";

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

function notSummable(): ExecutiveTargets["revenue"] {
  return { target_value: null, percent_of_target: { value: null, is_applicable: false, reason: "meta não agregável" } };
}

const NO_TARGETS: ExecutiveTargets = {
  date_from: "2026-08-01",
  date_to: "2026-08-31",
  revenue: notSummable(),
  profit: notSummable(),
  margin: notSummable(),
  cac: notSummable(),
  conversion_rate: notSummable(),
  average_ticket: notSummable(),
  recurrence_rate: notSummable(),
  monthly: [],
};

// Copy de teste: cada campo devolve algo que dá pra reconhecer no assert
// (nome do template + parâmetro), sem depender do catálogo i18n de verdade
// — a tradução real é testada pelos testes de página (analytics.spec.tsx),
// esta função só precisa provar que monta o Insight certo com os dados
// certos (RN-003, MetricDirection, agregação de meta).
const COPY: ExecutiveInsightCopy = {
  metricLabel: (key: TargetMetricKey) => key,
  biggestGrowth: { title: "growth-title", context: (m) => `growth-context:${m}`, cta: "growth-cta" },
  biggestDrop: { title: "drop-title", context: (m) => `drop-context:${m}`, cta: "drop-cta" },
  marginDeteriorating: { title: "margin-title", context: "margin-context", cta: "margin-cta" },
  cacUpConversionDown: { title: "cac-title", context: "cac-context", cta: "cac-cta" },
  targetHit: { title: "hit-title", context: (m) => `hit-context:${m}`, cta: "hit-cta" },
  targetMissed: { title: "missed-title", context: (m) => `missed-context:${m}`, cta: "missed-cta" },
  incompleteData: { title: "incomplete-title", context: (a, t) => `incomplete-context:${a}/${t}`, cta: "incomplete-cta" },
};

const PERIOD = "ago/2026";

function compute(dashboard: ExecutiveDashboard, targets: ExecutiveTargets | null = NO_TARGETS) {
  return computeExecutiveInsights(dashboard, targets, COPY, PERIOD);
}

describe("computeExecutiveInsights", () => {
  it("sem nenhuma comparação aplicável, não gera insight de variação nenhum", () => {
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
    const insights = compute(dashboard);
    expect(insights.find((i) => i.kind === "biggest_growth")).toBeUndefined();
    expect(insights.find((i) => i.kind === "biggest_drop")).toBeUndefined();
  });

  it("aponta o KPI que mais melhorou e o que mais piorou, cada um com seu próprio insight", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, revenue: metric(58200, 0.05), cac: metric(133.33, -0.417) };
    const insights = compute(dashboard);
    const growth = insights.find((i) => i.kind === "biggest_growth");
    const drop = insights.find((i) => i.kind === "biggest_drop");
    // CAC caindo é a melhor notícia do período (lower_is_better) -> growth.
    expect(growth?.evidence).toContain("-41,7%");
    expect(growth?.tone).toBe("positive");
    // Todas as variações do fixture são boas notícias (nenhuma métrica
    // piorou) — não sobra candidato nenhum pro insight de queda.
    expect(drop).toBeUndefined();
  });

  it("CAC subir é 'queda' (má notícia) mesmo sendo uma variação numericamente positiva", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, cac: metric(200, 0.417), revenue: metric(58200, 0) };
    const drop = compute(dashboard).find((i) => i.kind === "biggest_drop");
    expect(drop?.tone).toBe("negative");
    expect(drop?.evidence).toContain("+41,7%");
  });

  it("margem caindo dispara o insight mesmo com receita subindo", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, revenue: metric(58200, 0.124), margin: metric(0.3, -0.05) };
    const insight = compute(dashboard).find((i) => i.kind === "margin_deteriorating");
    expect(insight?.tone).toBe("negative");
    expect(insight?.evidence).toContain("-5%");
  });

  it("margem subindo não dispara o insight de deterioração", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, margin: metric(0.4, 0.05) };
    expect(compute(dashboard).find((i) => i.kind === "margin_deteriorating")).toBeUndefined();
  });

  it("CAC subindo e conversão caindo no mesmo período: insight composto dedicado", () => {
    const dashboard: ExecutiveDashboard = {
      ...BASE,
      cac: metric(150, 0.1),
      conversion_rate: metric(0.05, -0.2),
    };
    const insight = compute(dashboard).find((i) => i.kind === "cac_up_conversion_down");
    expect(insight?.tone).toBe("negative");
    expect(insight?.evidence).toContain("+10%");
    expect(insight?.evidence).toContain("-20%");
  });

  it("CAC subindo mas conversão também subindo: não gera o insight composto", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, cac: metric(150, 0.1), conversion_rate: metric(0.08, 0.05) };
    expect(compute(dashboard).find((i) => i.kind === "cac_up_conversion_down")).toBeUndefined();
  });

  it("sem meta definida, não gera nem meta batida nem meta perdida", () => {
    const insights = compute(BASE, NO_TARGETS);
    expect(insights.find((i) => i.kind === "target_hit")).toBeUndefined();
    expect(insights.find((i) => i.kind === "target_missed")).toBeUndefined();
  });

  it("meta de receita atingida (>= 100%) dispara 'target_hit'", () => {
    const targets: ExecutiveTargets = {
      ...NO_TARGETS,
      revenue: { target_value: 50000, percent_of_target: { value: 1.12, is_applicable: true, reason: null } },
    };
    const insight = compute(BASE, targets).find((i) => i.kind === "target_hit");
    expect(insight?.tone).toBe("positive");
    expect(insight?.evidence).toContain("112%");
  });

  it("meta de lucro não atingida (< 100%) dispara 'target_missed'", () => {
    const targets: ExecutiveTargets = {
      ...NO_TARGETS,
      profit: { target_value: 30000, percent_of_target: { value: 0.7, is_applicable: true, reason: null } },
    };
    const insight = compute(BASE, targets).find((i) => i.kind === "target_missed");
    expect(insight?.tone).toBe("negative");
    expect(insight?.evidence).toContain("70%");
  });

  it("meta definida só pras 5 métricas não-agregáveis (conversion_rate etc.) nunca dispara — sem checagem especial no frontend", () => {
    // As 5 sempre vêm com target_value null do backend (targets_service.py);
    // aqui só confirma que o frontend não tenta inventar hit/missed pra elas.
    expect(compute(BASE, NO_TARGETS).filter((i) => i.kind === "target_hit" || i.kind === "target_missed")).toEqual([]);
  });

  it("dado incompleto (financeiro) dispara o insight, com a contagem certa", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, months_in_range: 3, months_with_financial_data: 1 };
    const insight = compute(dashboard).find((i) => i.kind === "incomplete_data");
    expect(insight?.tone).toBe("neutral");
    expect(insight?.evidence).toBe("1/3");
    expect(insight?.context).toContain("1/3");
  });

  it("dado incompleto (funil) também dispara o insight", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, months_in_range: 3, months_with_funnel_data: 2 };
    expect(compute(dashboard).find((i) => i.kind === "incomplete_data")).toBeDefined();
  });

  it("período completo não dispara o insight de dado incompleto", () => {
    expect(compute(BASE).find((i) => i.kind === "incomplete_data")).toBeUndefined();
  });

  it("todo insight carrega o período recebido", () => {
    const dashboard: ExecutiveDashboard = { ...BASE, revenue: metric(58200, 0.3) };
    const insights = compute(dashboard);
    expect(insights.length).toBeGreaterThan(0);
    for (const insight of insights) {
      expect(insight.period).toBe(PERIOD);
    }
  });
});
