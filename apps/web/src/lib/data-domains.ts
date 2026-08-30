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
// de domains.py sempre que um domínio novo for adicionado.
export const DATA_DOMAINS: DataDomain[] = [
  { key: "financial_periods", label: "Financeiro", supportsDateRange: true },
  { key: "funnel_snapshots", label: "Funil", supportsDateRange: true },
  { key: "products", label: "Produtos", supportsDateRange: false },
  { key: "campaigns", label: "Marketing", supportsDateRange: true },
];
