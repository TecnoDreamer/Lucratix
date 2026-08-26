import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GlossaryPage from "./page";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useSearchParams: () => mockSearchParams,
}));

afterEach(() => {
  cleanup();
  mockSearchParams = new URLSearchParams();
});

describe("GlossaryPage", () => {
  it("lista as metricas agrupadas por letra, em ordem alfabetica", () => {
    render(<GlossaryPage />);
    // CAC agrupado sob "C"
    expect(screen.getByText("C", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText("CAC")).toBeInTheDocument();
  });

  it("busca filtra a lista (sigla, nome, alias e palavra da descricao)", () => {
    render(<GlossaryPage />);
    const search = screen.getByPlaceholderText("Buscar indicador...");

    fireEvent.change(search, { target: { value: "aquisição" } });
    expect(screen.getByText("CAC")).toBeInTheDocument();
    expect(screen.queryByText("ROAS")).not.toBeInTheDocument();
  });

  it("busca sem correspondencia mostra o empty state", () => {
    render(<GlossaryPage />);
    fireEvent.change(screen.getByPlaceholderText("Buscar indicador..."), {
      target: { value: "xxxxnaoexistexxxx" },
    });
    expect(screen.getByText("Nenhum indicador encontrado.")).toBeInTheDocument();
  });

  it("filtro de categoria mostra so metricas daquela categoria", () => {
    render(<GlossaryPage />);
    fireEvent.click(screen.getByRole("button", { name: "Financeiro" }));

    expect(screen.getByText("Margem de Lucro")).toBeInTheDocument();
    expect(screen.queryByText("CAC")).not.toBeInTheDocument();
  });

  it("clicar em 'Todos' remove o filtro de categoria", () => {
    render(<GlossaryPage />);
    fireEvent.click(screen.getByRole("button", { name: "Financeiro" }));
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));

    expect(screen.getByText("CAC")).toBeInTheDocument();
  });

  it("clicar num item expande a definicao completa", () => {
    render(<GlossaryPage />);
    const cacHeader = screen.getByRole("button", { name: /CAC/ });

    expect(cacHeader).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(cacHeader);
    expect(cacHeader).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/CAC = Investimento em Marketing/)).toBeInTheDocument();
  });

  it("indice alfabetico desabilita letras sem conteudo", () => {
    render(<GlossaryPage />);
    fireEvent.change(screen.getByPlaceholderText("Buscar indicador..."), {
      target: { value: "CAC" },
    });

    const nav = screen.getByRole("navigation", { name: "Navegação alfabética" });
    expect(within(nav).getByRole("button", { name: "C" })).toBeEnabled();
    expect(within(nav).getByRole("button", { name: "R" })).toBeDisabled();
  });

  it("deep-link ?metric=cac expande e destaca a metrica correspondente", async () => {
    mockSearchParams = new URLSearchParams("metric=cac");
    render(<GlossaryPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CAC/ })).toHaveAttribute("aria-expanded", "true");
    });
  });
});
