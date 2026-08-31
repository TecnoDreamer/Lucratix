/** Formatação numérica/data centralizada para o Analytics (P0 do prompt de
 * evolução do módulo — "centralize currency, percentage, integer, decimal,
 * compactNumber, date"). Nenhum outro módulo deve chamar `toLocaleString`
 * direto para esses casos — reaproveitar daqui.
 *
 * Sem símbolo de moeda (R$): convenção que já existia no projeto antes
 * deste módulo (nenhuma tela jamais formatou valor com prefixo de moeda —
 * ver o `formatMetric` anterior e `company-card.tsx`). `organizations.currency`
 * existe no schema mas não é lido em lugar nenhum do frontend hoje; não é
 * "inventado" aqui, só preservado.
 */

const LOCALE = "pt-BR";

export function formatDecimal(value: number, options?: { maximumFractionDigits?: number }): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: options?.maximumFractionDigits ?? 2 });
}

/** Mesma convenção de `formatDecimal` — ver nota de moeda acima. */
export function formatCurrency(value: number): string {
  return formatDecimal(value, { maximumFractionDigits: 2 });
}

export function formatInteger(value: number): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: 0 });
}

export function formatPercentage(
  value: number,
  options?: { maximumFractionDigits?: number; signed?: boolean }
): string {
  const pct = value * 100;
  const sign = options?.signed && pct > 0 ? "+" : "";
  return `${sign}${pct.toLocaleString(LOCALE, { maximumFractionDigits: options?.maximumFractionDigits ?? 1 })}%`;
}

/** "58200" -> "58,2 mil" — para rótulo/tooltip de gráfico, onde o número
 * inteiro ocuparia espaço demais. */
export function formatCompactNumber(value: number): string {
  return value.toLocaleString(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
}

const MONTH_ABBREVIATIONS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2026-06-01" -> "jun/26". `toLocaleDateString("pt-BR", {month:"short",
 * year:"2-digit"})` devolve "jun. de 26" (verboso demais para eixo de
 * gráfico) — abreviação fixa em vez de depender do formato por extenso do
 * locale. Parseado por índice de string (não `new Date(...)`) para não
 * sofrer deslocamento de fuso horário em datas `date`-only da API. */
export function formatMonthYear(period: string): string {
  const year = period.slice(2, 4);
  const monthIndex = Number(period.slice(5, 7)) - 1;
  return `${MONTH_ABBREVIATIONS[monthIndex] ?? "?"}/${year}`;
}
