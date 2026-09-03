import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FunnelStagesChart } from "./funnel-stages-chart";
import type { FunnelStages } from "@/lib/funnel-metrics";
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
