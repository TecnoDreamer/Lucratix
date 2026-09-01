import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OrganizationLogo } from "./organization-logo";

afterEach(() => {
  cleanup();
});

describe("OrganizationLogo", () => {
  it("mostra a imagem quando logoUrl está presente", () => {
    render(<OrganizationLogo logoUrl="https://res.cloudinary.com/demo/logo.png" name="Empresa X" />);
    const img = screen.getByRole("img", { name: "Empresa X" });
    expect(img).toHaveAttribute("alt", "Empresa X");
  });

  it("mostra o ícone de fallback quando logoUrl é null", () => {
    render(<OrganizationLogo logoUrl={null} name="Empresa X" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("mostra o ícone de fallback quando logoUrl é undefined", () => {
    render(<OrganizationLogo logoUrl={undefined} name="Empresa X" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
