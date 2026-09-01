import { useTranslations } from "next-intl";
import { formatDecimal, formatPercentage } from "@/lib/formatters";

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

/** As únicas métricas que aceitam meta hoje — mesmo conjunto do backend
 * (`app/models/target.py::TargetMetric`). */
export type TargetMetricKey =
  | "revenue"
  | "profit"
  | "margin"
  | "cac"
  | "conversion_rate"
  | "average_ticket"
  | "recurrence_rate";

/** Unidade dos 7 KPIs da Visão Executiva — mesma lista usada pelos
 * seletores de meta (`TargetsPanel`) e de correlação (`CorrelationPanel`).
 * Fonte única: antes duplicada em cada componente, extraída aqui pra não
 * triplicar "percent:true" pela terceira vez. Rótulo não fica aqui (função
 * pura, sem hook) — ver `useExecutiveMetricOptions` abaixo. */
export const EXECUTIVE_METRIC_KEYS: { key: TargetMetricKey; percent?: boolean }[] = [
  { key: "revenue" },
  { key: "profit" },
  { key: "margin", percent: true },
  { key: "cac" },
  { key: "conversion_rate", percent: true },
  { key: "average_ticket" },
  { key: "recurrence_rate", percent: true },
];

// Chave de messages/*.json (camelCase) para cada TargetMetricKey (snake_case)
// — mesmo mapa usado em reports/page.tsx para reaproveitar analytics.metricLabels.
const METRIC_LABEL_KEY: Record<TargetMetricKey, string> = {
  revenue: "revenue",
  profit: "profit",
  margin: "margin",
  cac: "cac",
  conversion_rate: "conversionRate",
  average_ticket: "averageTicket",
  recurrence_rate: "recurrenceRate",
};

/** Rótulo traduzido dos 7 KPIs da Visão Executiva, reaproveitando o mesmo
 * namespace `analytics.metricLabels` já usado pelos cards de Analytics —
 * evita duplicar "Receita"/"Margem"/etc. pela terceira vez em messages/*.json. */
export function useExecutiveMetricOptions(): { key: TargetMetricKey; label: string; percent?: boolean }[] {
  const t = useTranslations("analytics.metricLabels");
  // Chave dinâmica por métrica — mesmo padrão de cast usado em lib/quick-access.ts.
  const tDynamic = t as unknown as (key: string) => string;
  return EXECUTIVE_METRIC_KEYS.map((m) => ({ ...m, label: tDynamic(METRIC_LABEL_KEY[m.key]) }));
}

export interface Target {
  id: string;
  organization_id: string;
  metric: TargetMetricKey;
  period: string;
  value: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Progresso em relação à meta somada ao longo do intervalo — só aplicável
 * pra receita/lucro (métricas aditivas); as outras 5 vêm com `target_value:
 * null` e `percent_of_target.reason` explicando por quê (ver
 * `analytics/targets_service.py`). */
export interface TargetProgress {
  target_value: number | null;
  percent_of_target: MetricResult;
}

/** Meta bruta de cada KPI para um mês — `null` quando não definida.
 * Alimenta a linha de meta no gráfico de evolução (vale pras 7 métricas,
 * diferente de `TargetProgress`, que só vale pra receita/lucro). */
export interface MonthlyTarget {
  period: string;
  revenue: number | null;
  profit: number | null;
  margin: number | null;
  cac: number | null;
  conversion_rate: number | null;
  average_ticket: number | null;
  recurrence_rate: number | null;
}

export interface ExecutiveTargets {
  date_from: string;
  date_to: string;
  revenue: TargetProgress;
  profit: TargetProgress;
  margin: TargetProgress;
  cac: TargetProgress;
  conversion_rate: TargetProgress;
  average_ticket: TargetProgress;
  recurrence_rate: TargetProgress;
  monthly: MonthlyTarget[];
}

/** Um ponto do gráfico de dispersão — um por mês do intervalo, mesmo
 * quando uma das duas métricas está ausente naquele mês (`x`/`y` ficam
 * `null`, nunca 0). */
export interface CorrelationPoint {
  period: string;
  x: number | null;
  y: number | null;
}

/** Correlação de Pearson entre duas métricas mensais da Visão Executiva —
 * `correlation.is_applicable=false` quando há menos de 3 meses com as duas
 * métricas aplicáveis, ou quando uma delas não varia no período. */
export interface ExecutiveCorrelation {
  date_from: string;
  date_to: string;
  metric_x: TargetMetricKey;
  metric_y: TargetMetricKey;
  months_used: number;
  correlation: MetricResult;
  points: CorrelationPoint[];
}

/** Drill-down de `MarketingAnalytics` por canal — mesmas 7 métricas, cada
 * uma agregada só das campanhas daquele canal, sem comparação com período
 * anterior (o eixo aqui é "canal A vs. canal B", não "antes vs. depois"). */
export interface ChannelMarketing {
  channel_id: string;
  channel_name: string;
  campaign_count: number;
  roas: MetricResult;
  roi: MetricResult;
  ctr: MetricResult;
  cpc: MetricResult;
  cpm: MetricResult;
  cpl: MetricResult;
  cpa: MetricResult;
}

export interface MarketingByChannel {
  date_from: string;
  date_to: string;
  channels: ChannelMarketing[];
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

/** Formata a variação percentual de uma comparação de período — devolve
 * `notApplicableLabel` quando não há dado suficiente em um dos dois lados
 * (RN-003). O rótulo vem de fora (i18n, 2026-09-01) — esta função nunca lê
 * `useTranslations` sozinha, pra continuar utilizável fora de componente
 * React; o número em si nunca muda de formato por idioma (ver lib/formatters.ts). */
export function formatPercentChange(comparison: PeriodComparison, notApplicableLabel: string): string {
  if (comparison.percent_change === null) return notApplicableLabel;
  return formatPercentage(comparison.percent_change, { signed: true });
}

export function formatMetric(
  metric: MetricResult,
  options: { percent?: boolean; notApplicableLabel: string }
): string {
  if (!metric.is_applicable || metric.value === null) {
    return options.notApplicableLabel;
  }
  return options.percent ? formatPercentage(metric.value) : formatDecimal(metric.value);
}
