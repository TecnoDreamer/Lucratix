import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InsightsPanel } from "@/components/insights-panel";
import type { Insight } from "@/lib/insights";

afterEach(() => cleanup());

function insight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: "test-insight",
    kind: "biggest_growth",
    tone: "positive",
    title: "Maior crescimento do período",
    evidence: "Receita +12,4%",
    period: "ago/2026",
    context: "Receita foi o indicador que mais avançou.",
    cta: "Veja a evolução mensal abaixo.",
    ...overrides,
  };
}

describe("InsightsPanel", () => {
  it("sem insight nenhum, não renderiza nada", () => {
    const { container } = render(<InsightsPanel insights={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra as 5 partes de um insight: título, evidência, período, contexto e CTA", () => {
    render(<InsightsPanel insights={[insight()]} />);
    expect(screen.getByText("Maior crescimento do período")).toBeInTheDocument();
    expect(screen.getByText("Receita +12,4%")).toBeInTheDocument();
    expect(screen.getByText("ago/2026")).toBeInTheDocument();
    expect(screen.getByText("Receita foi o indicador que mais avançou.")).toBeInTheDocument();
    expect(screen.getByText("Veja a evolução mensal abaixo.")).toBeInTheDocument();
  });

  it("insight sem evidência nem período (ex.: baseline ausente) não quebra e não mostra a linha vazia", () => {
    render(
      <InsightsPanel
        insights={[insight({ kind: "no_baseline", evidence: undefined, period: undefined, tone: "neutral" })]}
      />
    );
    expect(screen.queryByText("ago/2026")).not.toBeInTheDocument();
    expect(screen.getByText("Maior crescimento do período")).toBeInTheDocument();
  });

  it("renderiza um cartão por insight, na ordem recebida", () => {
    render(
      <InsightsPanel
        insights={[
          insight({ id: "a", title: "Primeiro" }),
          insight({ id: "b", title: "Segundo", tone: "negative", kind: "biggest_drop" }),
        ]}
      />
    );
    expect(screen.getByText("Primeiro")).toBeInTheDocument();
    expect(screen.getByText("Segundo")).toBeInTheDocument();
  });
});
