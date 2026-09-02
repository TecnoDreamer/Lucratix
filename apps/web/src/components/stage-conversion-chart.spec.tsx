import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StageConversionChart } from "./stage-conversion-chart";
import type { StageConversion, StageConversionWithComparison } from "@/lib/funnel-metrics";
import type { MetricResult } from "@/lib/metrics";

afterEach(() => cleanup());

const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });
const notApplicable: MetricResult = { value: null, is_applicable: false, reason: "dado ausente: conversions" };

const tFields = (key: string): string =>
  ({
    impressions: "Impressões",
    visits: "Visitas",
    leads: "Leads",
    mqls: "MQLs",
    sqls: "SQLs",
    opportunities: "Oportunidades",
    customers: "Clientes",
    repeat_purchases: "Recompras",
  })[key] ?? key;

const CONVERSIONS_WITH_COMPARISON: StageConversionWithComparison[] = [
  {
    from_stage: "leads",
    to_stage: "mqls",
    conversion_rate: applicable(0.6),
    drop_off_rate: applicable(0.4),
    conversion_rate_comparison: { baseline_value: 0.5, current_value: 0.6, absolute_change: 0.1, percent_change: 0.2 },
  },
  {
    from_stage: "mqls",
    to_stage: "sqls",
    conversion_rate: applicable(0.2),
    drop_off_rate: applicable(0.8),
    conversion_rate_comparison: { baseline_value: null, current_value: 0.2, absolute_change: null, percent_change: null },
  },
];

describe("StageConversionChart", () => {
  it("renderiza uma linha por conversao com taxa/abandono/comparacao", () => {
    render(<StageConversionChart conversions={CONVERSIONS_WITH_COMPARISON} tFields={tFields} />);
    const rows = screen.getAllByRole("row");
    // 1 cabecalho + 2 conversoes
    expect(rows).toHaveLength(3);
    expect(rows[1].textContent).toContain("Leads → MQLs");
    expect(rows[1].textContent).toContain("60%");
    expect(rows[1].textContent).toContain("40%");
  });

  it("aponta a menor conversao aplicavel como gargalo", () => {
    render(<StageConversionChart conversions={CONVERSIONS_WITH_COMPARISON} tFields={tFields} />);
    expect(screen.getByText(/Menor conversão observada: de MQLs para SQLs \(20%\)/)).toBeInTheDocument();
  });

  it("sem nenhuma conversao aplicavel, mostra mensagem em vez de grafico vazio e nao mostra nota de gargalo", () => {
    const noneApplicable: StageConversion[] = [
      { from_stage: "leads", to_stage: "mqls", conversion_rate: notApplicable, drop_off_rate: notApplicable },
    ];
    render(<StageConversionChart conversions={noneApplicable} tFields={tFields} />);
    expect(screen.getByText("Sem dados suficientes no período.")).toBeInTheDocument();
    expect(screen.queryByText(/Menor conversão observada/)).not.toBeInTheDocument();
  });

  it("sem comparacao de periodo (drill-down por canal), a tabela nao mostra a coluna", () => {
    const withoutComparison: StageConversion[] = [
      { from_stage: "leads", to_stage: "mqls", conversion_rate: applicable(0.5), drop_off_rate: applicable(0.5) },
    ];
    render(<StageConversionChart conversions={withoutComparison} tFields={tFields} />);
    expect(screen.queryByText("Vs. período anterior")).not.toBeInTheDocument();
  });
});
