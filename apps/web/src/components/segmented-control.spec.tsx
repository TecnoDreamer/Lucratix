import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./segmented-control";

afterEach(() => cleanup());

const OPTIONS = [
  { value: "aggregated", label: "Agregado" },
  { value: "by_channel", label: "Por canal" },
];

describe("SegmentedControl", () => {
  it("marca a opcao selecionada com aria-pressed", () => {
    render(<SegmentedControl value="aggregated" onChange={() => {}} options={OPTIONS} ariaLabel="Visualização" />);
    expect(screen.getByRole("button", { name: "Agregado" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Por canal" })).toHaveAttribute("aria-pressed", "false");
  });

  it("clicar numa opcao chama onChange com o valor dela", () => {
    const onChange = vi.fn();
    render(<SegmentedControl value="aggregated" onChange={onChange} options={OPTIONS} ariaLabel="Visualização" />);
    fireEvent.click(screen.getByRole("button", { name: "Por canal" }));
    expect(onChange).toHaveBeenCalledWith("by_channel");
  });
});
