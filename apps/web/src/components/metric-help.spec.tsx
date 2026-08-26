import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetricHelp } from "./metric-help";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
}));

// jsdom nao implementa matchMedia — o componente usa para decidir entre o
// popover de desktop e o bottom sheet de mobile (ver metric-help.tsx).
// `matches: false` simula viewport de desktop, o caso exercitado por estes
// testes.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
});

describe("MetricHelp", () => {
  it("nao renderiza nada para uma metrica inexistente no catalogo", () => {
    const { container } = render(<MetricHelp metric="metrica-inexistente" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza o gatilho com aria-label baseado no nome da metrica", () => {
    render(<MetricHelp metric="cac" />);
    expect(
      screen.getByRole("button", { name: "Saiba mais sobre Custo de Aquisição de Cliente" })
    ).toBeInTheDocument();
  });

  it("o painel comeca fechado", () => {
    render(<MetricHelp metric="cac" />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("clique abre o painel com a explicacao da metrica", () => {
    render(<MetricHelp metric="cac" />);
    fireEvent.click(screen.getByRole("button", { name: /CAC|Custo de Aquisição/ }));

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeVisible();
    expect(tooltip).toHaveTextContent("CAC — Custo de Aquisição de Cliente");
    expect(tooltip).toHaveTextContent(/investimento em marketing/i);
  });

  it("clicar de novo fecha o painel (toggle)", () => {
    render(<MetricHelp metric="cac" />);
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("Escape fecha o painel e devolve o foco ao gatilho", async () => {
    render(<MetricHelp metric="cac" />);
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("clique fora fecha o painel", async () => {
    render(
      <div>
        <MetricHelp metric="cac" />
        <button type="button">fora</button>
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: /CAC|Custo de Aquisição/ }));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "fora" }));

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("hover (mouse) abre e mouseleave fecha quando nao esta fixado por clique", () => {
    render(<MetricHelp metric="cac" />);
    const trigger = screen.getByRole("button");

    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("foco por teclado abre e blur fecha quando nao esta fixado por clique", () => {
    render(<MetricHelp metric="cac" />);
    const trigger = screen.getByRole("button");

    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("inclui link para o glossario com deep-link da metrica", () => {
    render(<MetricHelp metric="cac" />);
    fireEvent.click(screen.getByRole("button"));

    const link = screen.getByRole("link", { name: /Ver explicação completa/ });
    expect(link).toHaveAttribute("href", "/organizations/org-123/glossario?metric=cac");
  });
});
