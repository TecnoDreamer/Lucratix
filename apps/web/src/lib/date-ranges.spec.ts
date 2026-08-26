import { describe, expect, it } from "vitest";
import { resolvePreset } from "./date-ranges";

// Quarta-feira, 26/08/2026 — meio do ano, meio de trimestre, para os
// calculos de "mes anterior"/"trimestre atual" nao caırem em bordas.
const TODAY = new Date(2026, 7, 26);

describe("resolvePreset", () => {
  it("current_month", () => {
    expect(resolvePreset("current_month", TODAY)).toEqual({
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    });
  });

  it("previous_month", () => {
    expect(resolvePreset("previous_month", TODAY)).toEqual({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });
  });

  it("previous_month atravessando virada de ano", () => {
    const january = new Date(2026, 0, 15);
    expect(resolvePreset("previous_month", january)).toEqual({
      dateFrom: "2025-12-01",
      dateTo: "2025-12-31",
    });
  });

  it("last_3_months inclui o mes atual", () => {
    expect(resolvePreset("last_3_months", TODAY)).toEqual({
      dateFrom: "2026-06-01",
      dateTo: "2026-08-31",
    });
  });

  it("last_6_months inclui o mes atual", () => {
    expect(resolvePreset("last_6_months", TODAY)).toEqual({
      dateFrom: "2026-03-01",
      dateTo: "2026-08-31",
    });
  });

  it("current_quarter", () => {
    // Agosto -> Q3 (jul-ago-set)
    expect(resolvePreset("current_quarter", TODAY)).toEqual({
      dateFrom: "2026-07-01",
      dateTo: "2026-09-30",
    });
  });

  it("current_year", () => {
    expect(resolvePreset("current_year", TODAY)).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
  });

  it("custom retorna null (o usuario preenche manualmente)", () => {
    expect(resolvePreset("custom", TODAY)).toBeNull();
  });
});
