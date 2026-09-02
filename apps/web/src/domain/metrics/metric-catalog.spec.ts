import { describe, expect, it } from "vitest";
import { METRIC_DEFINITIONS } from "./metric-definitions";
import {
  ALPHABET,
  filterMetricsByCategory,
  getMetricById,
  groupMetricsByLetter,
  normalizeText,
  searchMetrics,
  sortMetricsAlphabetically,
} from "./metric-utils";

describe("catalogo de metricas — integridade dos dados", () => {
  it("todo id e unico", () => {
    const ids = METRIC_DEFINITIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("toda metrica tem os campos obrigatorios preenchidos", () => {
    for (const metric of METRIC_DEFINITIONS) {
      expect(metric.name.length).toBeGreaterThan(0);
      expect(metric.shortDescription.length).toBeGreaterThan(0);
      expect(metric.description.length).toBeGreaterThan(0);
      expect(metric.aliases.length).toBeGreaterThanOrEqual(1);
      // Categoria "funil" cobre conceitos categoricos (Canal, Campanha...),
      // sem unit/direction — ver proxima asserção. Toda metrica numerica de
      // verdade continua exigindo os dois.
      if (metric.category !== "funil") {
        expect(["higher_is_better", "lower_is_better"]).toContain(metric.direction);
      }
    }
  });

  it("categoria 'funil' nunca tem unit/direction — sao conceitos, nao metricas numericas", () => {
    for (const metric of METRIC_DEFINITIONS.filter((m) => m.category === "funil")) {
      expect(metric.unit).toBeUndefined();
      expect(metric.direction).toBeUndefined();
    }
  });

  it("todo 'custo por X' (CAC, CPL, CPA, CPC, CPM) e lower_is_better", () => {
    // Nenhuma metrica de custo deveria ser "higher_is_better" por engano —
    // e a categoria mais fácil de inverter sem querer (todas em "currency"
    // como receita/lucro, só a direção muda).
    for (const id of ["cac", "cpl", "cpa", "cpc", "cpm"]) {
      expect(getMetricById(id)?.direction).toBe("lower_is_better");
    }
  });

  it("getMetricById encontra uma metrica existente e retorna undefined para inexistente", () => {
    expect(getMetricById("cac")?.acronym).toBe("CAC");
    expect(getMetricById("metrica-que-nao-existe")).toBeUndefined();
  });
});

describe("normalizeText", () => {
  it("remove acentos e caixa", () => {
    expect(normalizeText("Aquisição")).toBe("aquisicao");
    expect(normalizeText("CONVERSÃO")).toBe("conversao");
  });

  it("remove espacos nas pontas", () => {
    expect(normalizeText("  cac  ")).toBe("cac");
  });
});

describe("sortMetricsAlphabetically", () => {
  it("ordena por nome, ignorando acento e caixa, independente da ordem de entrada", () => {
    const sorted = sortMetricsAlphabetically(METRIC_DEFINITIONS);
    const names = sorted.map((m) => normalizeText(m.name));
    const expected = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
    expect(names).toEqual(expected);
  });

  it("nao mantem ordem manual: catalogo fora de ordem tambem sai ordenado", () => {
    const shuffled = [...METRIC_DEFINITIONS].reverse();
    const sorted = sortMetricsAlphabetically(shuffled);
    expect(sorted[0].id).not.toBe(shuffled[0].id);
    expect(sorted).toEqual(sortMetricsAlphabetically(METRIC_DEFINITIONS));
  });
});

describe("searchMetrics", () => {
  it("encontra por sigla exata", () => {
    const results = searchMetrics("CAC");
    expect(results.some((m) => m.id === "cac")).toBe(true);
  });

  it("encontra por palavra da descricao, sem diferenciar acento/caixa", () => {
    const results = searchMetrics("aquisição");
    expect(results.some((m) => m.id === "cac")).toBe(true);
  });

  it("encontra por alias em ingles", () => {
    const results = searchMetrics("customer acquisition cost");
    expect(results.some((m) => m.id === "cac")).toBe(true);
  });

  it("encontra por palavra parcial do nome", () => {
    const results = searchMetrics("cliente");
    expect(results.some((m) => m.id === "cac")).toBe(true);
  });

  it("query vazia retorna tudo, ordenado", () => {
    expect(searchMetrics("").length).toBe(METRIC_DEFINITIONS.length);
  });

  it("query sem correspondencia retorna lista vazia", () => {
    expect(searchMetrics("xxxxnaoexistexxxx")).toEqual([]);
  });
});

describe("filterMetricsByCategory", () => {
  it("filtra somente a categoria pedida", () => {
    const filtered = filterMetricsByCategory(METRIC_DEFINITIONS, "marketing");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((m) => m.category === "marketing")).toBe(true);
  });

  it("'all' retorna tudo sem filtrar", () => {
    expect(filterMetricsByCategory(METRIC_DEFINITIONS, "all")).toEqual(METRIC_DEFINITIONS);
  });
});

describe("groupMetricsByLetter", () => {
  it("agrupa cada metrica sob a primeira letra do nome (sem acento)", () => {
    const groups = groupMetricsByLetter(METRIC_DEFINITIONS);
    const cacGroup = groups.get("C");
    expect(cacGroup?.some((m) => m.id === "cac")).toBe(true);
  });

  it("cada grupo existente esta dentro do alfabeto valido", () => {
    const groups = groupMetricsByLetter(METRIC_DEFINITIONS);
    for (const letter of groups.keys()) {
      expect(ALPHABET).toContain(letter);
    }
  });

  it("dentro de cada grupo, as metricas continuam em ordem alfabetica", () => {
    const groups = groupMetricsByLetter(METRIC_DEFINITIONS);
    for (const metrics of groups.values()) {
      const names = metrics.map((m) => normalizeText(m.name));
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
    }
  });
});
