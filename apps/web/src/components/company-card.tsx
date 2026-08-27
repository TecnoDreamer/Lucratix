import Link from "next/link";
import { cardHover } from "@/lib/ui";
import { Badge } from "@/components/ui";
import { IconBuilding, IconChevronRight, IconClock } from "@/components/icons";
import { roleLabel } from "@/lib/roles";
import type { Organization } from "@/lib/types";

function formatCreatedAt(createdAt: string): string {
  try {
    return new Date(createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return createdAt;
  }
}

// Card da tela "Suas empresas" — Parte 1 do prompt de redesign (2026-08-27).
// Mostra só identificação e metadados reais (nome, nome fantasia, segmento,
// papel do usuário, data de criação). Não inclui KPIs (receita/leads/CAC
// etc.): a API de listagem (`GET /organizations`) não retorna essas métricas
// hoje — buscá-las por empresa aqui significaria uma chamada extra por card
// (N+1), o que é justamente a regressão de performance que a Parte 15 do
// prompt pede para evitar. Documentado como pendência de backend no relatório
// de entrega em vez de inventar dado ou buscar de forma cara.
export function CompanyCard({ organization }: { organization: Organization }) {
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
