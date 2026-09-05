import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildConversionTooltipItems, StageConversionChart } from "./stage-conversion-chart";
import type { FunnelStages, StageConversion, StageConversionWithComparison } from "@/lib/funnel-metrics";
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

  it("continua renderizando normalmente sem o prop `stages` (compatibilidade com chamadores existentes)", () => {
    const withoutComparison: StageConversion[] = [
      { from_stage: "leads", to_stage: "mqls", conversion_rate: applicable(0.5), drop_off_rate: applicable(0.5) },
    ];
    render(<StageConversionChart conversions={withoutComparison} tFields={tFields} />);
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });
});

describe("buildConversionTooltipItems", () => {
  const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });
  const t = (key: string) => ({ conversionRate: "Taxa de conversão", dropOffRate: "Taxa de abandono", loss: "Perda" })[key] ?? key;
  const tFields = (key: string) => ({ leads: "Leads", mqls: "MQLs" })[key] ?? key;

  const STAGES: FunnelStages = {
    impressions: applicable(0),
    visits: applicable(0),
    leads: applicable(905),
    mqls: applicable(505),
    sqls: applicable(0),
    opportunities: applicable(0),
    customers: applicable(0),
    repeat_purchases: applicable(0),
  };

  it("com stages disponível, inclui contagens absolutas e a perda calculada por subtração", () => {
    const items = buildConversionTooltipItems(
      { from: "leads", to: "mqls", value: 0.558, dropOff: applicable(0.442) },
      STAGES,
      t,
      tFields,
      "N/A"
    );
    expect(items).toEqual([
      { label: "Taxa de conversão", value: "55,8%" },
      { label: "Leads", value: "905" },
      { label: "MQLs", value: "505" },
      { label: "Perda", value: "400", tone: "warning" },
      { label: "Taxa de abandono", value: "44,2%", tone: "warning" },
    ]);
  });

  it("sem stages, mostra só taxa e abandono (nunca calcula perda com dado ausente)", () => {
    const items = buildConversionTooltipItems(
      { from: "leads", to: "mqls", value: 0.558, dropOff: applicable(0.442) },
      undefined,
      t,
      tFields,
      "N/A"
    );
    expect(items).toEqual([
      { label: "Taxa de conversão", value: "55,8%" },
      { label: "Taxa de abandono", value: "44,2%", tone: "warning" },
    ]);
  });

  it("taxa não aplicável usa o rótulo de N/A em vez de um número inventado", () => {
    const items = buildConversionTooltipItems(
      { from: "leads", to: "mqls", value: null, dropOff: { value: null, is_applicable: false, reason: "x" } },
      STAGES,
      t,
      tFields,
      "N/A"
    );
    expect(items[0]).toEqual({ label: "Taxa de conversão", value: "N/A" });
  });
});
