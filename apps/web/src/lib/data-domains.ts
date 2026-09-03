import { useTranslations } from "next-intl";
import type { MembershipRole } from "@/lib/types";

export interface DataDomain {
  key: string;
  label: string;
  // false para domínios sem conceito de período (ex.: Produtos — um
  // catálogo, não uma série temporal) — esconde o filtro de data no export.
  // Espelha DomainSpec.supports_date_range em
  // apps/api/app/modules/imports/domains.py.
  supportsDateRange: boolean;
  // false para domínios export-only (ex.: Auditoria — append-only, RN-015;
  // "importar" seria falsificar a trilha). Espelha DomainSpec.importable —
  // o assistente de importação (`import-wizard.tsx`) nunca deve oferecer um
  // domínio com `importable: false` como destino.
  importable: boolean;
  // Papel mínimo pra este domínio aparecer no painel de exportação — ausente
  // (a maioria) significa qualquer membership ativa, mesmo critério de
  // sempre. Espelha `exports/router.py::_DOMAIN_MINIMUM_ROLE`; sem isso o
  // painel ofereceria um domínio que o backend sempre recusaria pro papel
  // do usuário (ex.: VIEWER vendo "Auditoria", que exige ORGANIZATION_ADMIN).
  minRole?: MembershipRole;
}

// Espelha app/modules/imports/domains.py::DOMAIN_REGISTRY. Lista pequena
// demais (5 domínios) para valer a pena buscar de GET /imports/domains —
// que além disso exige ANALYST+ e só lista os importáveis, e o painel de
// exportação (lib/data-domains.ts é usado por ele também) é visível para
// VIEWER e precisa também do domínio export-only (Auditoria). Atualizar
// esta lista junto de domains.py sempre que um domínio novo for
// adicionado. Rótulo não fica aqui (função pura, sem hook) — ver
// `useDataDomains` abaixo.
export const DATA_DOMAIN_KEYS: {
  key: string;
  supportsDateRange: boolean;
  importable: boolean;
  minRole?: MembershipRole;
}[] = [
  { key: "financial_periods", supportsDateRange: true, importable: true },
  { key: "funnel_snapshots", supportsDateRange: true, importable: true },
  { key: "products", supportsDateRange: false, importable: true },
  { key: "campaigns", supportsDateRange: true, importable: true },
  {
    key: "audit_logs",
    supportsDateRange: true,
    importable: false,
    minRole: "ORGANIZATION_ADMIN",
  },
];

const DOMAIN_LABEL_KEY: Record<string, string> = {
  financial_periods: "financial",
  funnel_snapshots: "funnel",
  products: "products",
  campaigns: "marketing",
  audit_logs: "audit",
};

/** Domínios de dado traduzidos — usado tanto pelo painel de exportação
 * quanto pelo assistente de importação (`import-wizard.tsx`, que filtra
 * por `importable`). */
export function useDataDomains(): DataDomain[] {
  const t = useTranslations("common.dataDomains");
  return DATA_DOMAIN_KEYS.map((d) => ({ ...d, label: t(DOMAIN_LABEL_KEY[d.key]) }));
}
