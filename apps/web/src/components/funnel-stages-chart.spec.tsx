import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildStageLabelData, ExternalStageLabel, FunnelStagesChart } from "./funnel-stages-chart";
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

  it("densidade compacta reduz a altura renderizada (nunca esconde etapa)", () => {
    const { container: comfortable } = render(<FunnelStagesChart stages={FULL_STAGES} />);
    const { container: compact } = render(
      <FunnelStagesChart stages={FULL_STAGES} settings={{ chartType: "funnel", showValues: true, density: "compact" }} />
    );
    const comfortableHeight = parseFloat((comfortable.querySelector('[role="img"]') as HTMLElement).style.height);
    const compactHeight = parseFloat((compact.querySelector('[role="img"]') as HTMLElement).style.height);
    expect(compactHeight).toBeLessThan(comfortableHeight);
    // Continua com as 8 linhas na tabela — densidade nunca esconde dado.
    const table = within(compact).getByText("Funil, por etapa").closest("table")!;
    expect(table.querySelectorAll("tbody tr")).toHaveLength(8);
  });

  // chartType ("funnel" ⇄ "bars") troca o componente Recharts renderizado
  // (FunnelChart/BarChart), mas nenhum dos dois desenha conteúdo interno em
  // jsdom (ResponsiveContainer mede 0×0 sem layout real de navegador — ver
  // docs/charts/TESTES.md) — não tem seletor de DOM confiável pra
  // distinguir os dois aqui. Verificado manualmente num navegador real
  // (relatório da PR).
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

describe("ExternalStageLabel", () => {
  // Renderizado direto (sem ResponsiveContainer/Recharts no meio) — mesma
  // razão de buildStageLabelData ser função pura: o Recharts não desenha
  // conteúdo interno em jsdom (0×0 sem layout real de navegador), mas este
  // componente em si é só SVG comum, testável isolado.
  const data = [{ name: "Leads", value: 905, conversionLabel: "8,1% de Visitas" }];

  it("showValues=true desenha nome e o detalhe (valor + conversão)", () => {
    render(
      <svg>
        <ExternalStageLabel x={0} y={0} width={100} height={30} index={0} data={data} showValues />
      </svg>
    );
    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(screen.getByText("905 · 8,1% de Visitas")).toBeInTheDocument();
  });

  it("showValues=false esconde o detalhe, mas mantém o nome da etapa", () => {
    render(
      <svg>
        <ExternalStageLabel x={0} y={0} width={100} height={30} index={0} data={data} showValues={false} />
      </svg>
    );
    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(screen.queryByText("905 · 8,1% de Visitas")).not.toBeInTheDocument();
  });

  it("coordenadas inválidas (NaN) não desenham nada, em vez de quebrar", () => {
    const { container } = render(
      <svg>
        <ExternalStageLabel x={undefined} y={0} width={100} height={30} index={0} data={data} showValues />
      </svg>
    );
    expect(container.querySelector("text")).toBeNull();
  });
});
