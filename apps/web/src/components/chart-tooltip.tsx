"use client";

// Tooltip compartilhado para todo gráfico Recharts do produto (redesign do
// Funil, 2026-09-04) — antes cada gráfico usava o `<Tooltip>` padrão da
// lib, sem `content` customizado: caixa fixa (não respeita dark mode),
// sem controle de contraste/padding/sombra. Este componente não formata
// nada sozinho (fonte única de formatação continua em `lib/formatters.ts`/
// `lib/metrics.ts`) — só recebe texto já pronto e desenha de forma
// consistente. Cada gráfico passa isto como `content` do `<Tooltip>` do
// Recharts, adaptando `payload`/`label` pro formato `title`/`items` aqui.
export interface ChartTooltipItem {
  label: string;
  value: string;
  /** "warning" destaca a linha (ex.: perda/abandono) — mesmo âmbar já usado
   * para o gargalo em `StageConversionChart`. */
  tone?: "default" | "warning";
}

export function ChartTooltip({
  active,
  title,
  items,
}: {
  active?: boolean;
  title?: string;
  items?: ChartTooltipItem[];
}) {
  if (!active || !items || items.length === 0) return null;

  return (
    <div
      role="tooltip"
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {title && (
        <p className="mb-1.5 font-semibold text-slate-900 dark:text-slate-50">{title}</p>
      )}
      <dl className="flex flex-col gap-0.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <dt
              className={
                item.tone === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-500 dark:text-slate-400"
              }
            >
              {item.label}
            </dt>
            <dd
              className={`font-medium tabular-nums ${
                item.tone === "warning"
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-slate-900 dark:text-slate-50"
              }`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
