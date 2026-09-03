import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FunnelEvolutionChart } from "./funnel-evolution-chart";
import type { MonthlyFunnelStages } from "@/lib/funnel-metrics";
import type { MetricResult } from "@/lib/metrics";

afterEach(() => cleanup());

const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });
const missing: MetricResult = { value: null, is_applicable: false, reason: "dado ausente: leads" };

function point(period: string, leads: MetricResult): MonthlyFunnelStages {
  return {
    period,
    stages: {
      impressions: missing,
      visits: missing,
      leads,
      mqls: missing,
      sqls: missing,
      opportunities: missing,
      customers: missing,
      repeat_purchases: missing,
    },
  };
}

describe("FunnelEvolutionChart", () => {
  it("sem nenhum mes com dado na etapa, mostra mensagem em vez de grafico vazio", () => {
    const points = [point("2026-06-01", missing), point("2026-07-01", missing)];
    render(<FunnelEvolutionChart points={points} stage="leads" label="Leads" />);
    expect(screen.getByText("Sem dados suficientes no período.")).toBeInTheDocument();
  });

  it("renderiza um ponto por mes na tabela sr-only, mes sem dado aparece como 'sem dado' (nunca omitido)", () => {
    const points = [point("2026-06-01", applicable(100)), point("2026-07-01", missing), point("2026-08-01", applicable(150))];
    render(<FunnelEvolutionChart points={points} stage="leads" label="Leads" />);
    const table = screen.getByText("Evolução de Leads, por mês").closest("table")!;
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    expect(rows).toHaveLength(3);
    expect(rows[1].textContent).toContain("sem dado");
  });
});
