export type MetricCategory =
  | "financeiro"
  | "marketing"
  | "vendas"
  | "clientes"
  | "crescimento";

export type MetricUnit = "currency" | "percent" | "ratio" | "count" | "currency_per_1000";

/** Direção desejável da métrica — "subir é bom" (receita, ROAS, conversão)
 * vs. "descer é bom" (CAC, CPL, CPM — todo "custo por X"). Fonte única de
 * verdade para qualquer UI que precise colorir/interpretar uma variação
 * (ex.: `ComparisonBadge` em analytics/page.tsx) — nunca assumir que
 * "aumentou" = "positivo" sem checar isto (queda de CAC é uma boa notícia). */
export type MetricDirection = "higher_is_better" | "lower_is_better";

export interface MetricDefinition {
  id: string;
  name: string;
  acronym?: string;
  category: MetricCategory;
  shortDescription: string;
  description: string;
  formula?: string;
  example?: string;
  unit: MetricUnit;
  direction: MetricDirection;
  aliases: string[];
  /** Preenchido quando a metrica e educacional mas ainda nao aparece em
   * nenhum card calculado pelo backend hoje (ver auditoria, secao 4). */
  note?: string;
}

export const METRIC_CATEGORY_LABELS: Record<MetricCategory, string> = {
  financeiro: "Financeiro",
  marketing: "Marketing",
  vendas: "Vendas",
  clientes: "Clientes",
  crescimento: "Crescimento",
};
