import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CorrelationChart } from "./correlation-chart";
import type { CorrelationPoint } from "@/lib/metrics";

afterEach(() => cleanup());

const POINTS: CorrelationPoint[] = [
  { period: "2026-06-01", x: 10000, y: 100 },
  { period: "2026-07-01", x: 20000, y: 90 },
  { period: "2026-08-01", x: 30000, y: 80 },
];

describe("CorrelationChart", () => {
  it("sem nenhum par completo, mostra mensagem em vez de gráfico vazio", () => {
    const emptyPoints: CorrelationPoint[] = [
      { period: "2026-06-01", x: null, y: 100 },
      { period: "2026-07-01", x: 20000, y: null },
    ];
    render(<CorrelationChart points={emptyPoints} xLabel="Receita" yLabel="CAC" />);
    expect(screen.getByText("Sem meses com as duas métricas no período.")).toBeInTheDocument();
  });

  it("renderiza um ponto por mês com par completo, na tabela sr-only", () => {
    render(<CorrelationChart points={POINTS} xLabel="Receita" yLabel="CAC" />);
    const table = screen.getByText("Dispersão entre Receita e CAC, por mês").closest("table")!;
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    expect(rows).toHaveLength(3);
  });

  it("mês sem par (um dos dois ausente) aparece como 'sem dado' na tabela, não é descartado", () => {
    const withGap: CorrelationPoint[] = [...POINTS, { period: "2026-09-01", x: 40000, y: null }];
    render(<CorrelationChart points={withGap} xLabel="Receita" yLabel="CAC" />);
    const table = screen.getByText("Dispersão entre Receita e CAC, por mês").closest("table")!;
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    expect(rows).toHaveLength(4);
    expect(rows[3].textContent).toContain("sem dado");
  });

  it("desenha um círculo por par completo, sem NaN na posição", () => {
    const { container } = render(<CorrelationChart points={POINTS} xLabel="Receita" yLabel="CAC" />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(3);
    circles.forEach((c) => {
      expect(c.getAttribute("cx")).not.toContain("NaN");
      expect(c.getAttribute("cy")).not.toContain("NaN");
    });
  });

  it("eixo Y percentual formata os rótulos como percentual", () => {
    const percentPoints: CorrelationPoint[] = [
      { period: "2026-06-01", x: 10000, y: 0.1 },
      { period: "2026-07-01", x: 20000, y: 0.2 },
      { period: "2026-08-01", x: 30000, y: 0.3 },
    ];
    render(<CorrelationChart points={percentPoints} xLabel="Receita" yLabel="Margem" yPercent />);
    const table = screen.getByText("Dispersão entre Receita e Margem, por mês").closest("table")!;
    expect(table.textContent).toContain("10%");
  });
});
