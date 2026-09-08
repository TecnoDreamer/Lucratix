import { api } from "@/lib/api";
import type {
  ChartDensity,
  FunnelChartType,
  FunnelStagesChartSettings,
  StageConversionChartSettings,
} from "@/lib/chart-settings";

/** `chart_key` valido no backend (`CHART_PREFERENCE_SCHEMAS` em
 * `app/schemas/chart_preference.py`) — qualquer outro valor recebe 404 no
 * PATCH. */
export type ChartKey = "funnel-stages" | "stage-conversion";

/** Formato "fio" (snake_case, espelha o schema Pydantic do backend) — este
 * projeto nao converte case automaticamente, entao a conversao pros tipos
 * internos (camelCase, `lib/chart-settings.ts`) acontece explicitamente
 * aqui, na borda. */
interface FunnelStagesPreferencesWire {
  chart_type: FunnelChartType;
  show_values: boolean;
  density: ChartDensity;
}

interface StageConversionPreferencesWire {
  show_values: boolean;
  density: ChartDensity;
}

export interface ChartPreferencesResponse {
  organization_id: string;
  chart_key: string;
  preferences: Record<string, unknown> | null;
  updated_at: string | null;
}

function url(organizationId: string, chartKey: ChartKey): string {
  return `/api/v1/organizations/${organizationId}/chart-preferences/${chartKey}`;
}

export function fetchChartPreferences(
  organizationId: string,
  chartKey: ChartKey
): Promise<ChartPreferencesResponse> {
  return api.get<ChartPreferencesResponse>(url(organizationId, chartKey));
}

function saveChartPreferences(
  organizationId: string,
  chartKey: ChartKey,
  preferences: object | null
): Promise<ChartPreferencesResponse> {
  return api.patch<ChartPreferencesResponse>(url(organizationId, chartKey), { preferences });
}

export function saveFunnelStagesPreferences(
  organizationId: string,
  settings: FunnelStagesChartSettings
): Promise<ChartPreferencesResponse> {
  const wire: FunnelStagesPreferencesWire = {
    chart_type: settings.chartType,
    show_values: settings.showValues,
    density: settings.density,
  };
  return saveChartPreferences(organizationId, "funnel-stages", wire);
}

export function saveStageConversionPreferences(
  organizationId: string,
  settings: StageConversionChartSettings
): Promise<ChartPreferencesResponse> {
  const wire: StageConversionPreferencesWire = {
    show_values: settings.showValues,
    density: settings.density,
  };
  return saveChartPreferences(organizationId, "stage-conversion", wire);
}

const FUNNEL_CHART_TYPES: FunnelChartType[] = ["funnel", "bars"];
const CHART_DENSITIES: ChartDensity[] = ["comfortable", "compact"];

/** Nunca confia cegamente no que veio do servidor antes de repassar pro
 * Recharts (seção 12 do prompt de redesign: "valide com schema/allowlist").
 * Forma invalida ou desconhecida (inclusive um `schema_version` futuro que
 * este cliente nao entende) cai em `null` — quem chama usa o preset
 * "default" nesse caso. */
export function sanitizeFunnelStagesSettings(
  raw: unknown
): FunnelStagesChartSettings | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const { chart_type, show_values, density } = value;
  if (typeof chart_type !== "string" || !FUNNEL_CHART_TYPES.includes(chart_type as FunnelChartType)) {
    return null;
  }
  if (typeof show_values !== "boolean") return null;
  if (typeof density !== "string" || !CHART_DENSITIES.includes(density as ChartDensity)) return null;
  return {
    chartType: chart_type as FunnelChartType,
    showValues: show_values,
    density: density as ChartDensity,
  };
}

export function sanitizeStageConversionSettings(
  raw: unknown
): StageConversionChartSettings | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  const { show_values, density } = value;
  if (typeof show_values !== "boolean") return null;
  if (typeof density !== "string" || !CHART_DENSITIES.includes(density as ChartDensity)) return null;
  return { showValues: show_values, density: density as ChartDensity };
}
