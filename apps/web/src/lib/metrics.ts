/** Primeiro dia do mês corrente, no formato usado pelos endpoints de
 * dashboard/analytics (YYYY-MM-01). Usado tanto pelo Dashboard dedicado
 * quanto pelo resumo de KPIs da página inicial da empresa. */
export function currentMonthPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export interface MetricResult {
  value: number | null;
  is_applicable: boolean;
  reason: string | null;
}

export interface Dashboard {
  revenue: MetricResult;
  profit: MetricResult;
  margin: MetricResult;
  cac: MetricResult;
  conversion_rate: MetricResult;
  average_ticket: MetricResult;
  recurrence_rate: MetricResult;
}

export interface PeriodComparison {
  baseline_value: number | null;
  current_value: number | null;
  absolute_change: number | null;
  percent_change: number | null;
}

export interface MetricWithComparison {
  current: MetricResult;
  comparison: PeriodComparison;
}

export interface ExecutiveDashboard {
  date_from: string;
  date_to: string;
  previous_date_from: string;
  previous_date_to: string;
  months_in_range: number;
  months_with_financial_data: number;
  months_with_funnel_data: number;
  revenue: MetricWithComparison;
  profit: MetricWithComparison;
  margin: MetricWithComparison;
  cac: MetricWithComparison;
  conversion_rate: MetricWithComparison;
  average_ticket: MetricWithComparison;
  recurrence_rate: MetricWithComparison;
}

/** Resumo de indicadores de uma empresa para um período — GET
 * /organizations/summary, usado pelos cards da tela "Suas empresas".
 * `leads` é a contagem bruta do funil (não passa pelo motor de métricas,
 * por isso não é um MetricResult). */
export interface OrganizationSummary {
  organization_id: string;
  revenue: MetricResult;
  conversion_rate: MetricResult;
  cac: MetricResult;
  leads: number | null;
}

/** Um ponto da série mensal de KPIs (GET /analytics/executive/series) —
 * mesmos 7 campos do dashboard executivo, calculados isoladamente para
 * este mês (não acumulado). */
export interface MonthlyMetrics {
  period: string;
  revenue: MetricResult;
  profit: MetricResult;
  margin: MetricResult;
  cac: MetricResult;
  conversion_rate: MetricResult;
  average_ticket: MetricResult;
  recurrence_rate: MetricResult;
}

export interface ExecutiveSeries {
  date_from: string;
  date_to: string;
  points: MonthlyMetrics[];
}

export interface MarketingAnalytics {
  date_from: string;
  date_to: string;
  previous_date_from: string;
  previous_date_to: string;
  campaign_count: number;
  roas: MetricWithComparison;
  roi: MetricWithComparison;
  ctr: MetricWithComparison;
  cpc: MetricWithComparison;
  cpm: MetricWithComparison;
  cpl: MetricWithComparison;
  cpa: MetricWithComparison;
}

/** Formata a variação percentual de uma comparação de período — "não
 * aplicável" quando não há dado suficiente em um dos dois lados (RN-003). */
export function formatPercentChange(comparison: PeriodComparison): string {
  if (comparison.percent_change === null) return "não aplicável";
  const pct = comparison.percent_change * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function formatMetric(metric: MetricResult, options?: { percent?: boolean }): string {
  if (!metric.is_applicable || metric.value === null) {
    return "não aplicável";
  }
  if (options?.percent) {
    return `${(metric.value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  return metric.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
