import { useTranslations } from "next-intl";
import { METRIC_DEFINITIONS } from "./metric-definitions";
import type { MetricCategory, MetricDefinition } from "./metric-types";

// Faixa Unicode dos sinais diacriticos combinantes (acentos): U+0300 a U+036F.
// Construida a partir dos codigos numericos (nao de caracteres literais no
// arquivo-fonte) para nao depender de como o editor/git lida com combining
// marks brutos no proprio texto do codigo.
const DIACRITICS_RANGE_START = 0x0300;
const DIACRITICS_RANGE_END = 0x036f;
const COMBINING_DIACRITICS = new RegExp(
  `[${String.fromCharCode(DIACRITICS_RANGE_START)}-${String.fromCharCode(DIACRITICS_RANGE_END)}]`,
  "g"
);

/** Remove acentos e normaliza para minusculas, para busca tolerante a acentuacao. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim();
}

export function getMetricById(id: string): MetricDefinition | undefined {
  return METRIC_DEFINITIONS.find((m) => m.id === id);
}

/** Ordem alfabetica automatica pelo nome (RN: glossario nunca mantido manualmente). */
export function sortMetricsAlphabetically(metrics: MetricDefinition[]): MetricDefinition[] {
  return [...metrics].sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name), "pt-BR"));
}

/** Busca por sigla, nome, alias ou palavra da descricao — todas tolerantes a acento/caixa. */
export function searchMetrics(query: string, metrics: MetricDefinition[] = METRIC_DEFINITIONS): MetricDefinition[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return sortMetricsAlphabetically(metrics);

  return sortMetricsAlphabetically(
    metrics.filter((metric) => {
      const haystacks = [
        metric.name,
        metric.acronym ?? "",
        metric.shortDescription,
        metric.description,
        ...metric.aliases,
      ];
      return haystacks.some((text) => normalizeText(text).includes(normalizedQuery));
    })
  );
}

export function filterMetricsByCategory(
  metrics: MetricDefinition[],
  category: MetricCategory | "all"
): MetricDefinition[] {
  if (category === "all") return metrics;
  return metrics.filter((m) => m.category === category);
}

/** Agrupa por primeira letra do nome (ja normalizado), para navegacao A-Z do glossario. */
export function groupMetricsByLetter(metrics: MetricDefinition[]): Map<string, MetricDefinition[]> {
  const sorted = sortMetricsAlphabetically(metrics);
  const groups = new Map<string, MetricDefinition[]>();
  for (const metric of sorted) {
    const letter = normalizeText(metric.name).charAt(0).toUpperCase();
    const existing = groups.get(letter);
    if (existing) {
      existing.push(metric);
    } else {
      groups.set(letter, [metric]);
    }
  }
  return groups;
}

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Rótulo traduzido das categorias do glossário — diferente do nome/descrição/
// fórmula de cada métrica (METRIC_DEFINITIONS), que permanece em português
// sempre (ver ADR-0009): categoria é chrome de navegação (aba de filtro),
// não terminologia financeira que exige tradução especializada.
export function useMetricCategoryLabels(): Record<MetricCategory, string> {
  const t = useTranslations("glossario.categories");
  return {
    financeiro: t("financeiro"),
    marketing: t("marketing"),
    vendas: t("vendas"),
    clientes: t("clientes"),
    crescimento: t("crescimento"),
  };
}
