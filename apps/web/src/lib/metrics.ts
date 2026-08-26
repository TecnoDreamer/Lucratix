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
