export interface DataDomain {
  key: string;
  label: string;
}

// Espelha app/modules/imports/domains.py::DOMAIN_REGISTRY. Lista pequena
// demais (2 domínios) para valer a pena buscar de GET /imports/domains —
// que além disso exige ANALYST+, e o painel de exportação (lib/data-domains.ts
// é usado por ele também) é visível para VIEWER. Atualizar esta lista junto
// de domains.py sempre que um domínio novo for adicionado.
export const DATA_DOMAINS: DataDomain[] = [
  { key: "financial_periods", label: "Financeiro" },
  { key: "funnel_snapshots", label: "Funil" },
];
