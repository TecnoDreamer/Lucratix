/** Grupo de botões-pílula com uma opção selecionada por vez — extraído do
 * padrão já duplicado em `date-range-filter.tsx` (presets de período) e
 * `glossario/page.tsx` (categorias). Terceira ocorrência do mesmo desenho
 * (toggle Agregado/Por canal do Funil) — vale extrair em vez de copiar de
 * novo. Genérico em `T` (chave da opção), sem nenhuma lógica de negócio. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
