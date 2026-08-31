/** Exportação dos dados subjacentes ao gráfico de evolução mensal da
 * Visão Executiva — CSV puro (sem dependência), gerado no navegador a
 * partir do que já foi buscado (`GET /analytics/executive/series`), sem
 * chamada nova ao backend. Complementa a exportação de dado bruto já
 * existente na Central de Dados (`export-panel.tsx`): aqui é o dado já
 * *calculado* (KPI por mês), não a tabela `financial_periods`/
 * `funnel_snapshots` original.
 */

import type { ExecutiveSeries } from "@/lib/metrics";

interface ExecutiveSeriesColumn {
  key: "revenue" | "profit" | "margin" | "cac" | "conversion_rate" | "average_ticket" | "recurrence_rate";
  label: string;
}

const COLUMNS: ExecutiveSeriesColumn[] = [
  { key: "revenue", label: "Receita" },
  { key: "profit", label: "Lucro" },
  { key: "margin", label: "Margem" },
  { key: "cac", label: "CAC" },
  { key: "conversion_rate", label: "Conversão" },
  { key: "average_ticket", label: "Ticket médio" },
  { key: "recurrence_rate", label: "Recorrência" },
];

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvRow(values: string[]): string {
  return values.map(csvEscape).join(",");
}

export interface BuildExecutiveSeriesCsvOptions {
  organizationName: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: Date;
  timeZone: string;
  series: ExecutiveSeries;
}

/** Pura (recebe tudo já buscado/calculado, nunca acessa `Date.now()`
 * implicitamente nem `window`) — `generatedAt`/`timeZone` são passados
 * pelo chamador para o resultado ser determinístico em teste. */
export function buildExecutiveSeriesCsv(options: BuildExecutiveSeriesCsvOptions): {
  filename: string;
  content: string;
} {
  const { organizationName, dateFrom, dateTo, generatedAt, timeZone, series } = options;

  const lines: string[] = [
    csvRow(["Empresa", organizationName]),
    csvRow(["Período", `${dateFrom} a ${dateTo}`]),
    csvRow(["Gerado em", generatedAt.toISOString()]),
    csvRow(["Fuso horário", timeZone]),
    "",
    csvRow(["Mês", ...COLUMNS.map((c) => c.label)]),
  ];

  for (const point of series.points) {
    const row = [
      point.period,
      ...COLUMNS.map((c) => {
        const metric = point[c.key];
        return metric.is_applicable && metric.value !== null ? String(metric.value) : "";
      }),
    ];
    lines.push(csvRow(row));
  }

  return {
    filename: `visao_executiva_${dateFrom}_${dateTo}.csv`,
    content: lines.join("\r\n"),
  };
}
