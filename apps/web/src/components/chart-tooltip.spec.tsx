import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChartTooltip } from "./chart-tooltip";

afterEach(() => cleanup());

describe("ChartTooltip", () => {
  it("não renderiza nada quando inativo (comportamento padrão do Recharts)", () => {
    const { container } = render(
      <ChartTooltip active={false} title="Leads" items={[{ label: "Valor", value: "905" }]} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada sem itens, mesmo ativo", () => {
    const { container } = render(<ChartTooltip active items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra título e todos os itens quando ativo", () => {
    render(
      <ChartTooltip
        active
        title="Leads → MQL"
        items={[
          { label: "Taxa de conversão", value: "55,8%" },
          { label: "Leads", value: "905" },
          { label: "MQLs", value: "505" },
          { label: "Perda", value: "400", tone: "warning" },
          { label: "Taxa de abandono", value: "44,2%", tone: "warning" },
        ]}
      />
    );
    expect(screen.getByText("Leads → MQL")).toBeInTheDocument();
    expect(screen.getByText("Taxa de conversão")).toBeInTheDocument();
    expect(screen.getByText("55,8%")).toBeInTheDocument();
    expect(screen.getByText("Perda")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
  });

  it("funciona sem título (gráficos que não precisam de um cabeçalho)", () => {
    render(<ChartTooltip active items={[{ label: "Google Ads", value: "3,2x" }]} />);
    expect(screen.getByText("Google Ads")).toBeInTheDocument();
    expect(screen.getByText("3,2x")).toBeInTheDocument();
  });
});
