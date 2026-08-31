export interface Product {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  price: number | null;
  cost: number | null;
  active: boolean;
  margin: number | null;
}

export interface FinancialPeriod {
  id: string;
  organization_id: string;
  period: string;
  revenue: number | null;
  costs: number | null;
  expenses: number | null;
  marketing_investment: number | null;
  taxes: number | null;
  profit: number | null;
  margin: number | null;
}

export interface MarketingChannel {
  id: string;
  organization_id: string;
  name: string;
  type: string | null;
}

export interface Campaign {
  id: string;
  organization_id: string;
  channel_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  investment: number | null;
  impressions: number | null;
  clicks: number | null;
  leads: number | null;
  opportunities: number | null;
  customers: number | null;
  attributed_revenue: number | null;
  roas: number | null;
  ctr: number | null;
}

export interface FunnelSnapshot {
  id: string;
  organization_id: string;
  period: string;
  impressions: number | null;
  visits: number | null;
  leads: number | null;
  mqls: number | null;
  sqls: number | null;
  opportunities: number | null;
  customers: number | null;
  repeat_purchases: number | null;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  sample_size: number | null;
  conversions: number | null;
}

export interface Experiment {
  id: string;
  organization_id: string;
  hypothesis: string;
  page_or_process: string;
  primary_metric: string;
  start_date: string | null;
  end_date: string | null;
  status: "draft" | "running" | "finished";
  variants: ExperimentVariant[];
}

export interface ExperimentResult {
  variants: {
    name: string;
    sample_size: number | null;
    conversions: number | null;
    conversion_rate: { value: number | null; is_applicable: boolean; reason: string | null };
    // p-valor do teste-z de duas proporções contra a variante Controle
    // (a primeira da lista) — null na própria Controle, e em qualquer
    // variante enquanto has_sufficient_sample for false.
    p_value: number | null;
    is_significant: boolean | null;
  }[];
  has_sufficient_sample: boolean;
  leading_variant_name: string | null;
  note: string;
  significance_alpha: number;
}

export function formatValue(value: number | null): string {
  return value === null ? "não aplicável" : value.toLocaleString("pt-BR");
}
