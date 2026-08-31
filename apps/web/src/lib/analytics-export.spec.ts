import { describe, expect, it } from "vitest";
import { buildExecutiveSeriesCsv } from "./analytics-export";
import type { ExecutiveSeries, MetricResult } from "./metrics";

function metric(value: number | null): MetricResult {
  return { value, is_applicable: value !== null, reason: value === null ? "dado ausente" : null };
}

const SERIES: ExecutiveSeries = {
  date_from: "2026-07-01",
  date_to: "2026-08-31",
  points: [
    {
      period: "2026-07-01",
      revenue: metric(50000),
      profit: metric(18000),
      margin: metric(0.36),
      cac: metric(120),
      conversion_rate: metric(0.06),
      average_ticket: metric(900),
      recurrence_rate: metric(0.3),
    },
    {
      period: "2026-08-01",
      revenue: metric(58200),
      profit: metric(null),
      margin: metric(null),
      cac: metric(null),
      conversion_rate: metric(null),
      average_ticket: metric(null),
      recurrence_rate: metric(null),
    },
  ],
};

const OPTIONS = {
  organizationName: "Empresa Teste",
  dateFrom: "2026-07-01",
  dateTo: "2026-08-31",
  generatedAt: new Date("2026-08-31T12:00:00.000Z"),
  timeZone: "America/Sao_Paulo",
  series: SERIES,
};

describe("buildExecutiveSeriesCsv", () => {
  it("nome do arquivo inclui o intervalo de datas", () => {
    const { filename } = buildExecutiveSeriesCsv(OPTIONS);
    expect(filename).toBe("visao_executiva_2026-07-01_2026-08-31.csv");
  });

  it("cabeçalho de metadado inclui empresa, período, geração e fuso horário", () => {
    const { content } = buildExecutiveSeriesCsv(OPTIONS);
    const lines = content.split("\r\n");
    expect(lines[0]).toBe("Empresa,Empresa Teste");
    expect(lines[1]).toBe("Período,2026-07-01 a 2026-08-31");
    expect(lines[2]).toBe("Gerado em,2026-08-31T12:00:00.000Z");
    expect(lines[3]).toBe("Fuso horário,America/Sao_Paulo");
    expect(lines[4]).toBe(""); // linha em branco separando metadado da tabela
  });

  it("linha de cabeçalho da tabela usa nomes de exibição em português", () => {
    const { content } = buildExecutiveSeriesCsv(OPTIONS);
    const headerLine = content.split("\r\n")[5];
    expect(headerLine).toBe("Mês,Receita,Lucro,Margem,CAC,Conversão,Ticket médio,Recorrência");
  });

  it("uma linha por mês, valores numéricos crus (sem formatação localizada)", () => {
    const { content } = buildExecutiveSeriesCsv(OPTIONS);
    const rows = content.split("\r\n").slice(6);
    expect(rows[0]).toBe("2026-07-01,50000,18000,0.36,120,0.06,900,0.3");
  });

  it("mês sem dado (is_applicable=false) vira célula vazia, nunca 0", () => {
    const { content } = buildExecutiveSeriesCsv(OPTIONS);
    const rows = content.split("\r\n").slice(6);
    expect(rows[1]).toBe("2026-08-01,58200,,,,,,");
  });

  it("nome de empresa com vírgula é escapado entre aspas", () => {
    const { content } = buildExecutiveSeriesCsv({ ...OPTIONS, organizationName: "Empresa, Ltda" });
    expect(content.split("\r\n")[0]).toBe('Empresa,"Empresa, Ltda"');
  });
});
