export type MetricCategory =
  | "financeiro"
  | "marketing"
  | "vendas"
  | "clientes"
  | "crescimento";

export type MetricUnit = "currency" | "percent" | "ratio" | "count" | "currency_per_1000";

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
