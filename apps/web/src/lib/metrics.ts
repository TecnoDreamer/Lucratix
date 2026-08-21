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

export function formatMetric(metric: MetricResult, options?: { percent?: boolean }): string {
  if (!metric.is_applicable || metric.value === null) {
    return "nao aplicavel";
  }
  if (options?.percent) {
    return `${(metric.value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  return metric.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
