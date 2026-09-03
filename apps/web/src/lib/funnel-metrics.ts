import type { MetricResult, PeriodComparison } from "@/lib/metrics";

/** Mesma ordem fixa (RN-006) de `FUNNEL_STAGES`
 * (apps/api/app/modules/analytics/funnel_analytics.py) — usada em todo
 * lugar que itera as etapas, pra nunca ter duas ordens divergentes. */
export const FUNNEL_STAGE_KEYS = [
  "impressions",
  "visits",
  "leads",
  "mqls",
  "sqls",
  "opportunities",
  "customers",
  "repeat_purchases",
] as const;

export type FunnelStageKey = (typeof FUNNEL_STAGE_KEYS)[number];

/** As 8 etapas do funil, cada uma um `MetricResult` — mirror de
 * `FunnelStagesRead` (schemas/metrics.py). */
export type FunnelStages = Record<FunnelStageKey, MetricResult>;

/** Um par consecutivo de etapas (ex.: leads -> mqls), com sua conversão e
 * abandono — mirror de `StageConversionRead`. */
export interface StageConversion {
  from_stage: FunnelStageKey;
  to_stage: FunnelStageKey;
  conversion_rate: MetricResult;
  drop_off_rate: MetricResult;
}

/** Igual a `StageConversion`, com a taxa de conversão comparada ao período
 * anterior equivalente — mirror de `StageConversionWithComparisonRead`. */
export interface StageConversionWithComparison extends StageConversion {
  conversion_rate_comparison: PeriodComparison;
}

/** GET /analytics/funnel — mirror de `FunnelAnalyticsRead`. */
export interface FunnelAnalytics {
  date_from: string;
  date_to: string;
  previous_date_from: string;
  previous_date_to: string;
  stages: FunnelStages;
  conversions: StageConversionWithComparison[];
}

/** Drill-down de `FunnelAnalytics` por canal — mirror de
 * `ChannelFunnelRead`. Sem comparação de período (eixo é canal A vs. canal
 * B, mesmo critério de `ChannelMarketing`). */
export interface ChannelFunnel {
  channel_id: string;
  channel_name: string;
  stages: FunnelStages;
  conversions: StageConversion[];
}

/** GET /analytics/funnel/by-channel — mirror de `FunnelByChannelRead`. */
export interface FunnelByChannel {
  date_from: string;
  date_to: string;
  channels: ChannelFunnel[];
}

/** Um ponto da série mensal do funil agregado — mirror de
 * `MonthlyFunnelStagesRead`. */
export interface MonthlyFunnelStages {
  period: string;
  stages: FunnelStages;
}

/** GET /analytics/funnel/series — mirror de `FunnelSeriesRead`. */
export interface FunnelSeries {
  date_from: string;
  date_to: string;
  points: MonthlyFunnelStages[];
}
