import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CompanyCard } from "./company-card";
import type { Organization } from "@/lib/types";

const BASE_ORG: Organization = {
  id: "org-123",
  name: "Empresa Teste",
  trade_name: null,
  segment: null,
  cnpj: null,
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  tracking_start_date: null,
  notes: null,
  created_at: "2026-01-15T10:00:00Z",
  my_role: "ORGANIZATION_OWNER",
};

afterEach(() => {
  cleanup();
});

describe("CompanyCard", () => {
  it("mostra o nome, o papel amigável e a data de criação", () => {
    render(<CompanyCard organization={BASE_ORG} />);

    expect(screen.getByText("Empresa Teste")).toBeInTheDocument();
    expect(screen.getByText("Proprietário")).toBeInTheDocument();
    expect(screen.getByText(/Criada em/)).toBeInTheDocument();
    expect(screen.getByText("Abrir empresa →")).toBeInTheDocument();
  });

  it("aponta para a rota correta da empresa", () => {
    render(<CompanyCard organization={BASE_ORG} />);
    expect(screen.getByRole("link", { name: /Empresa Teste/ })).toHaveAttribute(
      "href",
      "/organizations/org-123"
    );
  });

  it("mostra nome fantasia e segmento quando disponíveis", () => {
    render(
      <CompanyCard
        organization={{ ...BASE_ORG, trade_name: "Nome Fantasia", segment: "E-commerce" }}
      />
    );
    expect(screen.getByText("Nome Fantasia")).toBeInTheDocument();
    expect(screen.getByText("E-commerce")).toBeInTheDocument();
  });

  it("não quebra quando nome fantasia, segmento e papel estão ausentes", () => {
    render(<CompanyCard organization={{ ...BASE_ORG, my_role: null }} />);
    expect(screen.getByText("Empresa Teste")).toBeInTheDocument();
    expect(screen.queryByText("Proprietário")).not.toBeInTheDocument();
  });

  it("usa o rótulo amigável para cada papel", () => {
    const { rerender } = render(<CompanyCard organization={{ ...BASE_ORG, my_role: "VIEWER" }} />);
    expect(screen.getByText("Visualizador")).toBeInTheDocument();

    rerender(<CompanyCard organization={{ ...BASE_ORG, my_role: "ANALYST" }} />);
    expect(screen.getByText("Analista")).toBeInTheDocument();

    rerender(<CompanyCard organization={{ ...BASE_ORG, my_role: "ORGANIZATION_ADMIN" }} />);
    expect(screen.getByText("Administrador")).toBeInTheDocument();
  });
});
