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

  it("rótulo de mês nas pontas cresce pra dentro do gráfico, não fica centralizado na borda", () => {
    // "middle" nas pontas cortava metade do texto pra fora do viewBox
    // (achado 4.2 da auditoria: "jun/26" virava ".n/26", "ago/26" virava
    // "ago/2"). O primeiro rótulo cresce à direita (start), o último à
    // esquerda (end); só os do meio continuam centralizados.
    const { container } = render(<SeriesChart points={POINTS} label="Receita" />);
    const monthLabels = Array.from(container.querySelectorAll("svg > text")).filter((el) =>
      /^(jun|jul|ago)\/26$/.test(el.textContent ?? "")
    );
    expect(monthLabels[0]).toHaveAttribute("text-anchor", "start");
    expect(monthLabels[monthLabels.length - 1]).toHaveAttribute("text-anchor", "end");
  });

  it("único ponto no período usa âncora centralizada (não há 'ponta' fazendo sentido)", () => {
    const { container } = render(<SeriesChart points={[point("2026-08-01", 58200)]} label="Receita" />);
    const monthLabel = container.querySelector("svg > text");
    expect(monthLabel).toHaveAttribute("text-anchor", "middle");
  });

  it("mostra o valor mínimo e máximo no eixo Y — antes só dava pra saber passando o mouse", () => {
    const { container } = render(<SeriesChart points={POINTS} label="Receita" />);
    const svgTexts = Array.from(container.querySelectorAll("svg text")).map((el) => el.textContent);
    expect(svgTexts).toContain(formatCompactNumber(58200)); // maior valor
    expect(svgTexts).toContain(formatCompactNumber(50000)); // menor valor
  });

  it("linha reta (todo mês com o mesmo valor) mostra o valor uma única vez no eixo Y, não duplicado", () => {
    const flat = [point("2026-06-01", 50000), point("2026-07-01", 50000), point("2026-08-01", 50000)];
    const { container } = render(<SeriesChart points={flat} label="Receita" />);
    const svgTexts = Array.from(container.querySelectorAll("svg text")).filter(
      (el) => el.textContent === formatCompactNumber(50000)
    );
    expect(svgTexts).toHaveLength(1);
  });

  it("legenda (Valor/Meta) só aparece quando há meta em algum mês", () => {
    const { rerender } = render(<SeriesChart points={POINTS} label="Receita" />);
    expect(screen.queryByText("Meta")).not.toBeInTheDocument();

    rerender(<SeriesChart points={POINTS} label="Receita" targets={[52000, null, 60000]} />);
    // "Meta" aparece 2x agora (legenda + cabeçalho da tabela sr-only) —
    // basta confirmar que deixou de estar ausente.
    expect(screen.getAllByText("Meta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Valor").length).toBeGreaterThan(0);
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
