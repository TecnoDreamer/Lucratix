import { useTranslations } from "next-intl";

export interface DataDomain {
  key: string;
  label: string;
  // false para domínios sem conceito de período (ex.: Produtos — um
  // catálogo, não uma série temporal) — esconde o filtro de data no export.
  // Espelha DomainSpec.supports_date_range em
  // apps/api/app/modules/imports/domains.py.
  supportsDateRange: boolean;
}

// Espelha app/modules/imports/domains.py::DOMAIN_REGISTRY. Lista pequena
// demais (4 domínios) para valer a pena buscar de GET /imports/domains —
// que além disso exige ANALYST+, e o painel de exportação (lib/data-domains.ts
// é usado por ele também) é visível para VIEWER. Atualizar esta lista junto
// de domains.py sempre que um domínio novo for adicionado. Rótulo não fica
// aqui (função pura, sem hook) — ver `useDataDomains` abaixo.
export const DATA_DOMAIN_KEYS: { key: string; supportsDateRange: boolean }[] = [
  { key: "financial_periods", supportsDateRange: true },
  { key: "funnel_snapshots", supportsDateRange: true },
  { key: "products", supportsDateRange: false },
  { key: "campaigns", supportsDateRange: true },
];

const DOMAIN_LABEL_KEY: Record<string, string> = {
  financial_periods: "financial",
  funnel_snapshots: "funnel",
  products: "products",
  campaigns: "marketing",
};

/** Domínios de dado traduzidos — usado tanto pelo painel de exportação
 * quanto pelo assistente de importação (`import-wizard.tsx`). */
export function useDataDomains(): DataDomain[] {
  const t = useTranslations("common.dataDomains");
  return DATA_DOMAIN_KEYS.map((d) => ({ ...d, label: t(DOMAIN_LABEL_KEY[d.key]) }));
}
