import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateRangeFilter } from "./date-range-filter";

afterEach(() => {
  cleanup();
});

describe("DateRangeFilter", () => {
  it("mostra todos os presets, com 'Este mês' selecionado por padrão", () => {
    render(<DateRangeFilter value={{ dateFrom: "", dateTo: "" }} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Este mês" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Últimos 3 meses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Personalizado" })).toBeInTheDocument();
  });

  it("clicar em um preset chama onChange com o intervalo resolvido", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter value={{ dateFrom: "", dateTo: "" }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [range] = onChange.mock.calls[0];
    expect(range.dateFrom.endsWith("-01")).toBe(true);
  });

  it("'Personalizado' revela os campos De/Até", () => {
    render(<DateRangeFilter value={{ dateFrom: "", dateTo: "" }} onChange={() => {}} />);
    expect(screen.queryByLabelText("De")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));

    expect(screen.getByLabelText("De")).toBeInTheDocument();
    expect(screen.getByLabelText("Até")).toBeInTheDocument();
  });

  it("preencher De/Até chama onChange", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter value={{ dateFrom: "", dateTo: "" }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-08-01" } });
    expect(onChange).toHaveBeenCalledWith({ dateFrom: "2026-08-01", dateTo: "" });
  });

  it("data inicial depois da final mostra erro e nao chama onChange", () => {
    const onChange = vi.fn();
    render(<DateRangeFilter value={{ dateFrom: "2026-08-01", dateTo: "2026-08-15" }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-09-01" } });

    expect(screen.getByText(/não pode ser depois/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
