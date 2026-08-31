import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { formatCompactNumber } from "@/lib/formatters";
import { SeriesChart, type SeriesPoint } from "./series-chart";

afterEach(() => cleanup());

function point(period: string, value: number | null): SeriesPoint {
  return { period, metric: { value, is_applicable: value !== null, reason: value === null ? "sem dado" : null } };
}

const POINTS: SeriesPoint[] = [point("2026-06-01", 50000), point("2026-07-01", 55000), point("2026-08-01", 58200)];

describe("SeriesChart", () => {
  it("sem prop targets, não renderiza coluna de meta na tabela sr-only", () => {
    render(<SeriesChart points={POINTS} label="Receita" />);
    expect(screen.queryByText("Meta")).not.toBeInTheDocument();
  });

  it("com targets, mostra a meta de cada mês na tabela sr-only, inclusive 'sem meta' pro mês sem valor", () => {
    render(<SeriesChart points={POINTS} label="Receita" targets={[52000, null, 60000]} />);
    const table = screen.getByText("Receita — evolução mensal, por mês").closest("table")!;
    const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) => tr.textContent);
    expect(rows[0]).toContain(formatCompactNumber(52000));
    expect(rows[1]).toContain("sem meta");
    expect(rows[2]).toContain(formatCompactNumber(60000));
  });

  it("linha de meta some do path quando nenhum mês tem meta definida", () => {
    const { container } = render(<SeriesChart points={POINTS} label="Receita" targets={[null, null, null]} />);
    // Só a linha de valor real (stroke-width 2) deveria existir — a
    // tracejada (stroke-dasharray) não é renderizada sem nenhuma meta.
    expect(container.querySelector('path[stroke-dasharray]')).not.toBeInTheDocument();
  });

  it("meta acima de todo o dado real ainda entra na escala (path sem NaN)", () => {
    const { container } = render(<SeriesChart points={POINTS} label="Receita" targets={[100000, 100000, 100000]} />);
    const dashedPath = container.querySelector('path[stroke-dasharray]');
    expect(dashedPath).toBeInTheDocument();
    expect(dashedPath?.getAttribute("d")).not.toContain("NaN");
  });

  it("tooltip do ponto inclui a meta do mês quando existe", () => {
    const { container } = render(<SeriesChart points={POINTS} label="Receita" targets={[52000, null, null]} />);
    const firstCircleTitle = container.querySelector("circle title");
    expect(firstCircleTitle?.textContent).toContain(`meta: ${formatCompactNumber(52000)}`);
  });

  it("mês sem dado real e sem meta continua sem quebrar (buraco em ambas as linhas)", () => {
    const withGap = [point("2026-06-01", 50000), point("2026-07-01", null), point("2026-08-01", 58200)];
    const { container } = render(
      <SeriesChart points={withGap} label="Receita" targets={[52000, null, 60000]} />
    );
    const linePath = container.querySelector('path[stroke-linejoin="round"]');
    expect(linePath?.getAttribute("d")).not.toContain("NaN");
  });
});
