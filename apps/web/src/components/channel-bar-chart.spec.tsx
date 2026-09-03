import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChannelBarChart, type ChannelBarChartDatum } from "./channel-bar-chart";

afterEach(() => cleanup());

const DATA: ChannelBarChartDatum[] = [
  { key: "a", label: "Google Ads", value: 3.5 },
  { key: "b", label: "E-mail Marketing", value: 1.2 },
];

describe("ChannelBarChart", () => {
  it("renderiza o gráfico com o aria-label recebido", () => {
    render(<ChannelBarChart data={DATA} valueFormatter={(v) => `${v}x`} label="ROAS por Canal" />);
    expect(screen.getByRole("img", { name: "ROAS por Canal" })).toBeInTheDocument();
  });

  it("sem nenhum valor aplicável, mostra mensagem em vez de gráfico vazio", () => {
    const none: ChannelBarChartDatum[] = [{ key: "a", label: "Google Ads", value: null }];
    render(<ChannelBarChart data={none} valueFormatter={(v) => `${v}x`} label="ROAS por Canal" />);
    expect(screen.getByText("Sem dado suficiente no período para este gráfico")).toBeInTheDocument();
  });

  it("ignora valores nao aplicaveis (null) ao calcular o destaque, sem quebrar", () => {
    const mixed: ChannelBarChartDatum[] = [
      { key: "a", label: "Google Ads", value: 3.5 },
      { key: "b", label: "Sem dado", value: null },
    ];
    render(<ChannelBarChart data={mixed} valueFormatter={(v) => `${v}x`} label="ROAS por Canal" />);
    expect(screen.getByRole("img", { name: "ROAS por Canal" })).toBeInTheDocument();
  });
});
