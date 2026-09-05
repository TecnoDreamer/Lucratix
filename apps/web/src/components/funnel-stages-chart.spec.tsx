import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildStageLabelData, FunnelStagesChart } from "./funnel-stages-chart";
import type { FunnelStages, StageConversion } from "@/lib/funnel-metrics";
import type { MetricResult } from "@/lib/metrics";

afterEach(() => cleanup());

const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });
const missing = (field: string): MetricResult => ({ value: null, is_applicable: false, reason: `dado ausente: ${field}` });

const FULL_STAGES: FunnelStages = {
  impressions: applicable(10000),
  visits: applicable(3000),
  leads: applicable(800),
  mqls: applicable(400),
  sqls: applicable(200),
  opportunities: applicable(120),
  customers: applicable(50),
  repeat_purchases: applicable(12),
};

describe("FunnelStagesChart", () => {
  it("sem nenhuma etapa aplicável, mostra mensagem em vez de gráfico vazio", () => {
    const empty: FunnelStages = {
      impressions: missing("impressions"),
      visits: missing("visits"),
      leads: missing("leads"),
      mqls: missing("mqls"),
      sqls: missing("sqls"),
      opportunities: missing("opportunities"),
      customers: missing("customers"),
      repeat_purchases: missing("repeat_purchases"),
    };
    render(<FunnelStagesChart stages={empty} />);
    expect(screen.getByText("Sem dados suficientes no período.")).toBeInTheDocument();
  });

  it("renderiza as 8 etapas na tabela sr-only, na ordem certa", () => {
    render(<FunnelStagesChart stages={FULL_STAGES} />);
    const table = screen.getByText("Funil, por etapa").closest("table")!;
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    expect(rows).toHaveLength(8);
    expect(rows[0].textContent).toContain("Impressões");
    expect(rows[0].textContent).toMatch(/10.mil/);
    expect(rows[7].textContent).toContain("Recompras");
  });

  it("etapa nao aplicavel no meio corta o funil ali (nunca vira 0)", () => {
    const partial: FunnelStages = {
      ...FULL_STAGES,
      sqls: missing("sqls"),
    };
    render(<FunnelStagesChart stages={partial} />);
    const table = screen.getByText("Funil, por etapa").closest("table")!;
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    // impressions, visits, leads, mqls — para antes de sqls, que nao e aplicavel.
    expect(rows).toHaveLength(4);
  });

  it("aceita um rótulo (canal) e usa no aria-label", () => {
    render(<FunnelStagesChart stages={FULL_STAGES} label="Google Ads" />);
    expect(screen.getByRole("img", { name: "Google Ads — funil" })).toBeInTheDocument();
  });
});

describe("buildStageLabelData", () => {
  const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });
  const t = (key: string, values?: Record<string, string>) =>
    key === "conversionOfPrevious" ? `${values!.rate} de ${values!.previous}` : key;
  const tFields = (key: string) => ({ visits: "Visitas", leads: "Leads", mqls: "MQLs" })[key] ?? key;

  const conversions: StageConversion[] = [
    { from_stage: "visits", to_stage: "leads", conversion_rate: applicable(0.081), drop_off_rate: applicable(0.919) },
    { from_stage: "leads", to_stage: "mqls", conversion_rate: applicable(0.558), drop_off_rate: applicable(0.442) },
  ];

  it("primeira etapa nunca tem conversão (não existe 'anterior')", () => {
    const data = buildStageLabelData([{ key: "visits", value: 11200 }], conversions, t, tFields);
    expect(data[0]).toEqual({ name: "Visitas", value: 11200, conversionLabel: null });
  });

  it("combina nome e conversão em relação à etapa anterior, sem recalcular a taxa", () => {
    const data = buildStageLabelData(
      [
        { key: "visits", value: 11200 },
        { key: "leads", value: 905 },
      ],
      conversions,
      t,
      tFields
    );
    expect(data[1]).toEqual({ name: "Leads", value: 905, conversionLabel: "8,1% de Visitas" });
  });

  it("sem o array de conversões, todas as etapas ficam sem conversão (mas nome/valor continuam)", () => {
    const data = buildStageLabelData(
      [
        { key: "visits", value: 11200 },
        { key: "leads", value: 905 },
      ],
      undefined,
      t,
      tFields
    );
    expect(data.every((d) => d.conversionLabel === null)).toBe(true);
  });

  it("funciona com diferença extrema de escala entre etapas, sem gerar NaN/undefined", () => {
    const extreme: StageConversion[] = [
      { from_stage: "visits", to_stage: "leads", conversion_rate: applicable(0.00002), drop_off_rate: applicable(0.99998) },
    ];
    const data = buildStageLabelData(
      [
        { key: "visits", value: 10_000_000 },
        { key: "leads", value: 2 },
      ],
      extreme,
      t,
      tFields
    );
    expect(data[1].conversionLabel).not.toContain("NaN");
    expect(data[1].conversionLabel).not.toContain("undefined");
  });
});
