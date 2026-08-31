import { describe, expect, it } from "vitest";
import { describeCorrelation } from "./correlation";

describe("describeCorrelation", () => {
  it("r próximo de 1 é forte e positiva", () => {
    const result = describeCorrelation(0.85);
    expect(result.strength).toBe("forte");
    expect(result.direction).toBe("positiva");
    expect(result.label).toBe("Correlação forte positiva");
  });

  it("r próximo de -1 é forte e negativa", () => {
    const result = describeCorrelation(-0.9);
    expect(result.strength).toBe("forte");
    expect(result.direction).toBe("negativa");
  });

  it("r moderado (0,4 a 0,7)", () => {
    expect(describeCorrelation(0.5).strength).toBe("moderada");
  });

  it("r fraco (0,2 a 0,4)", () => {
    expect(describeCorrelation(0.25).strength).toBe("fraca");
  });

  it("r muito próximo de zero é muito fraca, sem direção", () => {
    const result = describeCorrelation(0);
    expect(result.strength).toBe("muito fraca");
    expect(result.direction).toBeNull();
    expect(result.label).toBe("Sem correlação");
  });

  it("é simétrico em módulo — mesma força para r e -r", () => {
    expect(describeCorrelation(0.6).strength).toBe(describeCorrelation(-0.6).strength);
  });
});
