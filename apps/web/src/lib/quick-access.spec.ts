import { describe, expect, it } from "vitest";
import { DEFAULT_QUICK_ACCESS_IDS, resolveQuickAccess, visibleQuickAccess } from "./quick-access";

describe("resolveQuickAccess", () => {
  it("sem preferência (null), devolve todos os cards permitidos pelo papel, na ordem do registro", () => {
    const resolved = resolveQuickAccess("ORGANIZATION_OWNER", null);
    expect(resolved.map((e) => e.card.id)).toEqual(DEFAULT_QUICK_ACCESS_IDS);
    expect(resolved.every((e) => e.enabled)).toBe(true);
  });

  it("caso crítico: preferência não pode ressuscitar um card que o papel atual não permite", () => {
    // VIEWER nao pode ver Analytics (exige ANALYST+) mesmo que a preferencia
    // salva diga enabled:true — a regra e recalculada a partir do papel
    // ATUAL a cada chamada, nunca confiada ao que foi persistido.
    const resolved = resolveQuickAccess("VIEWER", [{ id: "analytics", enabled: true }]);
    expect(resolved.some((e) => e.card.id === "analytics")).toBe(false);
  });

  it("respeita a ordem da preferência salva", () => {
    const resolved = resolveQuickAccess("ORGANIZATION_OWNER", [
      { id: "marketing", enabled: true },
      { id: "analytics", enabled: true },
    ]);
    expect(resolved.map((e) => e.card.id).slice(0, 2)).toEqual(["marketing", "analytics"]);
  });

  it("um id desconhecido na preferência é ignorado silenciosamente", () => {
    const resolved = resolveQuickAccess("ORGANIZATION_OWNER", [
      { id: "modulo-inventado", enabled: true },
      { id: "analytics", enabled: true },
    ]);
    expect(resolved.some((e) => e.card.id === "modulo-inventado")).toBe(false);
    expect(resolved.some((e) => e.card.id === "analytics")).toBe(true);
  });

  it("um id duplicado na preferência só aparece uma vez", () => {
    const resolved = resolveQuickAccess("ORGANIZATION_OWNER", [
      { id: "analytics", enabled: true },
      { id: "analytics", enabled: false },
    ]);
    expect(resolved.filter((e) => e.card.id === "analytics")).toHaveLength(1);
  });

  it("um card permitido mas ausente da preferência aparece no fim, habilitado", () => {
    const resolved = resolveQuickAccess("ORGANIZATION_OWNER", [{ id: "marketing", enabled: true }]);
    const last = resolved[resolved.length - 1];
    expect(last.card.id).not.toBe("marketing");
    // todos os outros ids (permitidos, ausentes da preferencia) aparecem
    // depois de "marketing", habilitados por padrao.
    const marketingIndex = resolved.findIndex((e) => e.card.id === "marketing");
    for (const entry of resolved.slice(marketingIndex + 1)) {
      expect(entry.enabled).toBe(true);
    }
  });

  it("respeita enabled:false vindo da preferência", () => {
    const resolved = resolveQuickAccess("ORGANIZATION_OWNER", [
      { id: "analytics", enabled: false },
    ]);
    expect(resolved.find((e) => e.card.id === "analytics")?.enabled).toBe(false);
  });
});

describe("visibleQuickAccess", () => {
  it("filtra apenas os cards habilitados", () => {
    const visible = visibleQuickAccess("ORGANIZATION_OWNER", [
      { id: "analytics", enabled: false },
      { id: "marketing", enabled: true },
    ]);
    expect(visible.map((c) => c.id)).not.toContain("analytics");
    expect(visible.map((c) => c.id)).toContain("marketing");
  });

  it("sem papel (null/undefined), nenhum card com minRole aparece", () => {
    const visible = visibleQuickAccess(null, null);
    expect(visible.some((c) => c.id === "analytics")).toBe(false);
    // cards sem minRole continuam visiveis.
    expect(visible.some((c) => c.id === "financials")).toBe(true);
  });
});
