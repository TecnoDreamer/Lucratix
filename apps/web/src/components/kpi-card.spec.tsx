import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconDollar } from "@/components/icons";
import { KpiCard } from "@/components/kpi-card";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
}));

afterEach(() => {
  cleanup();
});

describe("KpiCard", () => {
  it("mostra rótulo, valor e ícone", () => {
    render(<KpiCard size="primary" label="Receita" icon={IconDollar} value="R$ 58.200" />);
    expect(screen.getByText("Receita")).toBeInTheDocument();
    expect(screen.getByText("R$ 58.200")).toBeInTheDocument();
  });

  it("mostra o motivo quando a métrica não é aplicável (dado ausente não é zero)", () => {
    render(
      <KpiCard
        size="secondary"
        label="Conversão"
        icon={IconDollar}
        value="não aplicável"
        reason="dado ausente: conversions"
      />
    );
    expect(screen.getByText("dado ausente: conversions")).toBeInTheDocument();
  });

  it("cartão primário usa texto de valor maior que o secundário", () => {
    const { container: primary } = render(<KpiCard size="primary" label="Receita" icon={IconDollar} value="100" />);
    const primaryValue = primary.querySelector("p.text-2xl");
    expect(primaryValue).not.toBeNull();
    cleanup();
    const { container: secondary } = render(
      <KpiCard size="secondary" label="Ticket médio" icon={IconDollar} value="100" />
    );
    expect(secondary.querySelector("p.text-lg")).not.toBeNull();
    expect(secondary.querySelector("p.text-2xl")).toBeNull();
  });

  it("renderiza a linha de tendência passada pelo chamador", () => {
    render(
      <KpiCard
        size="primary"
        label="Receita"
        icon={IconDollar}
        value="100"
        trend={<p data-testid="trend">+10% (melhora)</p>}
      />
    );
    expect(screen.getByTestId("trend")).toHaveTextContent("+10% (melhora)");
  });
});
