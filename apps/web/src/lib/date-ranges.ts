// Presets de intervalo de datas para Analytics — apenas granularidade
// mensal, porque os dados (FinancialPeriod/FunnelSnapshot) só existem por
// mês. Presets do tipo "Hoje"/"Últimos 7 dias" não são oferecidos: não têm
// dado nenhum para sustentar essa granularidade (ver docs/analytics/FILTERS.md).

export type DateRangePresetId =
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "last_6_months"
  | "current_quarter"
  | "current_year"
  | "custom";

export type DateRange = { dateFrom: string; dateTo: string };

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, monthIndex0: number): Date {
  return new Date(year, monthIndex0 + 1, 0);
}

export function resolvePreset(preset: DateRangePresetId, today: Date = new Date()): DateRange | null {
  const y = today.getFullYear();
  const m = today.getMonth();

  switch (preset) {
    case "current_month":
      return { dateFrom: toIso(new Date(y, m, 1)), dateTo: toIso(lastDayOfMonth(y, m)) };
    case "previous_month":
      return { dateFrom: toIso(new Date(y, m - 1, 1)), dateTo: toIso(lastDayOfMonth(y, m - 1)) };
    case "last_3_months":
      return { dateFrom: toIso(new Date(y, m - 2, 1)), dateTo: toIso(lastDayOfMonth(y, m)) };
    case "last_6_months":
      return { dateFrom: toIso(new Date(y, m - 5, 1)), dateTo: toIso(lastDayOfMonth(y, m)) };
    case "current_quarter": {
      const quarterStartMonth = Math.floor(m / 3) * 3;
      return {
        dateFrom: toIso(new Date(y, quarterStartMonth, 1)),
        dateTo: toIso(lastDayOfMonth(y, quarterStartMonth + 2)),
      };
    }
    case "current_year":
      return { dateFrom: toIso(new Date(y, 0, 1)), dateTo: toIso(new Date(y, 11, 31)) };
    case "custom":
      return null;
  }
}

// Rótulo não fica aqui (função pura, sem hook) — `date-range-filter.tsx`
// monta o rótulo traduzido de cada preset via useTranslations.
export const DATE_RANGE_PRESET_IDS: DateRangePresetId[] = [
  "current_month",
  "previous_month",
  "last_3_months",
  "last_6_months",
  "current_quarter",
  "current_year",
  "custom",
];
