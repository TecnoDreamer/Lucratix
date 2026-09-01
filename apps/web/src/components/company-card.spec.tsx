import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CompanyCard } from "./company-card";
import type { OrganizationSummary } from "@/lib/metrics";
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
  status: "active",
  closed_at: null,
  closure_reason: null,
  logo_url: null,
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

  it("não mostra a seção de indicadores quando summary não é passado", () => {
    render(<CompanyCard organization={BASE_ORG} />);
    expect(screen.queryByText("Receita")).not.toBeInTheDocument();
  });

  it("mostra Receita, Leads, Conversão e CAC quando summary está disponível", () => {
    const summary: OrganizationSummary = {
      organization_id: "org-123",
      revenue: { value: 42850, is_applicable: true, reason: null },
      conversion_rate: { value: 0.084, is_applicable: true, reason: null },
      cac: { value: 145.5, is_applicable: true, reason: null },
      leads: 328,
    };
    render(<CompanyCard organization={BASE_ORG} summary={summary} />);

    expect(screen.getByText("Receita")).toBeInTheDocument();
    expect(screen.getByText("42.850")).toBeInTheDocument();
    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(screen.getByText("328")).toBeInTheDocument();
    expect(screen.getByText("Conversão")).toBeInTheDocument();
    expect(screen.getByText("8,4%")).toBeInTheDocument();
    expect(screen.getByText("CAC")).toBeInTheDocument();
    expect(screen.getByText("145,5")).toBeInTheDocument();
  });

  it("mostra 'não aplicável' quando uma métrica não tem dado no período", () => {
    const summary: OrganizationSummary = {
      organization_id: "org-123",
      revenue: { value: null, is_applicable: false, reason: "sem dado financeiro no periodo" },
      conversion_rate: { value: null, is_applicable: false, reason: null },
      cac: { value: null, is_applicable: false, reason: null },
      leads: null,
    };
    render(<CompanyCard organization={BASE_ORG} summary={summary} />);

    expect(screen.getAllByText("não aplicável")).toHaveLength(4);
  });
});
