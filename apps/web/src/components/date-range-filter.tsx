"use client";

import { useState } from "react";
import {
  DATE_RANGE_PRESETS,
  resolvePreset,
  type DateRange,
  type DateRangePresetId,
} from "@/lib/date-ranges";
import { input as inputClass, label as labelClass } from "@/lib/ui";

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
      setError("A data inicial não pode ser depois da data final.");
      return;
    }
    setError(null);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
        {DATE_RANGE_PRESETS.map(({ id, label }) => (
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
            {label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            De
            <input
              type="date"
              value={value.dateFrom}
              onChange={(e) => handleCustomChange("dateFrom", e.target.value)}
              className={`${inputClass} w-auto`}
            />
          </label>
          <label className={labelClass}>
            Até
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
