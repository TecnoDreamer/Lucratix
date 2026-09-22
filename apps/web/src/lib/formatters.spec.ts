import { describe, expect, it } from "vitest";
import {
  formatCompactNumber,
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatMonthYear,
  formatPercentage,
  formatPeriodRange,
} from "./formatters";

describe("formatDecimal", () => {
  it("usa vírgula decimal e até 2 casas por padrão", () => {
    expect(formatDecimal(1234.5)).toBe("1.234,5");
    expect(formatDecimal(1234.567)).toBe("1.234,57");
  });

  it("respeita maximumFractionDigits customizado", () => {
    expect(formatDecimal(1234.567, { maximumFractionDigits: 0 })).toBe("1.235");
  });
});

describe("formatCurrency", () => {
  it("mesma convenção de formatDecimal — sem símbolo de moeda", () => {
    expect(formatCurrency(58200)).toBe("58.200");
    expect(formatCurrency(133.33)).toBe("133,33");
  });
});

describe("formatInteger", () => {
  it("sem casas decimais", () => {
    expect(formatInteger(1234.9)).toBe("1.235");
  });
});

describe("formatPercentage", () => {
  it("multiplica por 100 e adiciona %, 1 casa por padrão", () => {
    expect(formatPercentage(0.359)).toBe("35,9%");
  });

  it("signed adiciona + só para valores positivos", () => {
    expect(formatPercentage(0.124, { signed: true })).toBe("+12,4%");
    expect(formatPercentage(-0.05, { signed: true })).toBe("-5%");
    expect(formatPercentage(0, { signed: true })).toBe("0%");
  });
});

describe("formatCompactNumber", () => {
  it("números abaixo de mil não ganham sufixo", () => {
    expect(formatCompactNumber(133.33)).toBe("133,3");
  });

  it("milhares ganham sufixo compacto", () => {
    // Intl usa espaço não separável (U+00A0) entre número e sufixo.
    expect(formatCompactNumber(58200)).toBe("58,2 mil");
  });
});

describe("formatMonthYear", () => {
  it("formata mês/ano abreviado em pt-BR", () => {
    expect(formatMonthYear("2026-06-01")).toBe("jun/26");
    expect(formatMonthYear("2026-12-15")).toBe("dez/26");
  });

  it("não sofre deslocamento de fuso horário (parse por índice, não Date)", () => {
    expect(formatMonthYear("2026-01-01")).toBe("jan/26");
  });
});

describe("formatPeriodRange", () => {
  it("mesmo mês em dateFrom/dateTo vira um único rótulo", () => {
    expect(formatPeriodRange("2026-08-01", "2026-08-31")).toBe("ago/26");
  });

  it("meses diferentes viram um intervalo", () => {
    expect(formatPeriodRange("2026-07-01", "2026-08-31")).toBe("jul/26 – ago/26");
  });
});
