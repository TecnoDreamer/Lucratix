import Link from "next/link";
import { cardHover } from "@/lib/ui";
import { Badge } from "@/components/ui";
import { IconBuilding, IconChevronRight, IconClock } from "@/components/icons";
import { roleLabel } from "@/lib/roles";
import { formatMetric, type OrganizationSummary } from "@/lib/metrics";
import type { Organization } from "@/lib/types";

function formatCreatedAt(createdAt: string): string {
  try {
    return new Date(createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return createdAt;
  }
}

// Card da tela "Suas empresas" — Parte 1 do prompt de redesign (2026-08-27).
// Identificação e metadados (nome, nome fantasia, segmento, papel do
// usuário, data de criação) sempre presentes. Indicadores (Receita, Leads,
// Conversão, CAC — mesmas 4 métricas do mockup do próprio prompt) só
// aparecem quando `summary` é passado pela página: vem de
// GET /organizations/summary, um único request para todas as empresas do
// usuário (evita N+1 de rede/banco — ver apps/api/app/modules/organizations/router.py).
// Ausente/undefined (ainda carregando ou a chamada falhou) = card some a
// seção de indicadores, sem loading infinito nem dado inventado no lugar.
export function CompanyCard({
  organization,
  summary,
}: {
  organization: Organization;
  summary?: OrganizationSummary;
}) {
  const role = roleLabel(organization.my_role);

  return (
    <Link
      href={`/organizations/${organization.id}`}
      className={`${cardHover} group flex flex-col gap-3 p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-600/30">
            <IconBuilding className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-900 dark:text-slate-50">
              {organization.name}
            </span>
            {organization.trade_name && (
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {organization.trade_name}
              </span>
            )}
          </span>
        </div>
        <IconChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
      </div>

      {(role || organization.segment) && (
        <div className="flex flex-wrap gap-1.5">
          {role && <Badge tone="blue">{role}</Badge>}
          {organization.segment && <Badge tone="slate">{organization.segment}</Badge>}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-center dark:bg-slate-800/60">
          {[
            { label: "Receita", value: formatMetric(summary.revenue) },
            { label: "Leads", value: summary.leads === null ? "não aplicável" : summary.leads.toLocaleString("pt-BR") },
            { label: "Conversão", value: formatMetric(summary.conversion_rate, { percent: true }) },
            { label: "CAC", value: formatMetric(summary.cac) },
          ].map(({ label: metricLabel, value }) => (
            <div key={metricLabel} className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {metricLabel}
              </p>
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <span className="flex items-center gap-1.5">
          <IconClock className="h-3.5 w-3.5" />
          Criada em {formatCreatedAt(organization.created_at)}
        </span>
        <span className="font-medium text-blue-600 group-hover:underline dark:text-blue-400">
          Abrir empresa →
        </span>
      </div>
    </Link>
  );
}
