"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DATE_RANGE_PRESET_IDS,
  resolvePreset,
  type DateRange,
  type DateRangePresetId,
} from "@/lib/date-ranges";
import { input as inputClass, label as labelClass } from "@/lib/ui";

const PRESET_LABEL_KEY: Record<DateRangePresetId, string> = {
  current_month: "currentMonth",
  previous_month: "previousMonth",
  last_3_months: "last3Months",
  last_6_months: "last6Months",
  current_quarter: "currentQuarter",
  current_year: "currentYear",
  custom: "custom",
};

/**
 * Filtro de intervalo de datas com presets — seção 7 do prompt de BI.
 * Só presets de granularidade mensal (ver lib/date-ranges.ts): os dados
 * disponíveis não sustentam "Hoje"/"Últimos 7 dias".
 */
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const t = useTranslations("common.dateRangeFilter");
  const [preset, setPreset] = useState<DateRangePresetId>("current_month");
  const [error, setError] = useState<string | null>(null);

  function handlePresetChange(next: DateRangePresetId) {
    setPreset(next);
    setError(null);
    const resolved = resolvePreset(next);
    if (resolved) onChange(resolved);
  }

  function handleCustomChange(field: "dateFrom" | "dateTo", raw: string) {
    const next = { ...value, [field]: raw };
    if (next.dateFrom && next.dateTo && next.dateFrom > next.dateTo) {
      setError(t("invalidRange"));
      return;
    }
    setError(null);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("period")}>
        {DATE_RANGE_PRESET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={preset === id}
            onClick={() => handlePresetChange(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === id
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {t(`presets.${PRESET_LABEL_KEY[id]}`)}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            {t("from")}
            <input
              type="date"
              value={value.dateFrom}
              onChange={(e) => handleCustomChange("dateFrom", e.target.value)}
              className={`${inputClass} w-auto`}
            />
          </label>
          <label className={labelClass}>
            {t("to")}
            <input
              type="date"
              value={value.dateTo}
              onChange={(e) => handleCustomChange("dateTo", e.target.value)}
              className={`${inputClass} w-auto`}
            />
          </label>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
