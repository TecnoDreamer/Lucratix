import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMetricReasonLabel } from "@/lib/metric-reason";

function label(reason: string | null) {
  const { result } = renderHook(() => useMetricReasonLabel());
  return result.current(reason);
}

describe("useMetricReasonLabel", () => {
  it("null passa direto (não é motivo nenhum, é ausência de motivo)", () => {
    expect(label(null)).toBeNull();
  });

  it("traduz 'dado ausente: <campo>' sem vazar o nome interno do campo", () => {
    const text = label("dado ausente: revenue");
    expect(text).not.toContain("revenue");
    expect(text).toContain("receita");
  });

  it("traduz 'divisao por zero: <campo>' pra frase legível", () => {
    expect(label("divisao por zero: base")).toBe("Divisão por zero: base de cálculo");
  });

  it("campo desconhecido cai pro nome cru em vez de quebrar", () => {
    const text = label("dado ausente: campo_novo_do_futuro");
    expect(text).toContain("campo_novo_do_futuro");
  });

  it("frase já legível (ex.: motivo de correlação) passa sem alteração", () => {
    const original = "uma das métricas não varia no período — correlação indefinida";
    expect(label(original)).toBe(original);
  });
});
