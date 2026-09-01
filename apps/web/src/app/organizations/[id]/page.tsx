"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonPrimary, card, cardHover, input, label, link as linkClass, sectionTitle } from "@/lib/ui";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { QuickAccessCard } from "@/components/quick-access-card";
import { useOrganization } from "@/contexts/organization-context";
import { useDashboard } from "@/hooks/use-dashboard";
import { useWorkspacePreferences } from "@/hooks/use-workspace-preferences";
import { currentMonthPeriod, formatMetric } from "@/lib/metrics";
import { canPerformActions, roleLabel } from "@/lib/roles";
import { quickAccessHref, visibleQuickAccess } from "@/lib/quick-access";
import {
  IconClock,
  IconDollar,
  IconFileText,
  IconFlask,
  IconGrid,
  IconMegaphone,
  IconPackage,
  IconTrendingDown,
  IconTrendingUp,
} from "@/components/icons";
import type { Baseline } from "@/lib/types";

function formatNumber(value: number | null): string {
  return value === null ? "não aplicável" : value.toLocaleString("pt-BR");
}

function formatTrackingSince(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// O registro de cards de acesso rápido (rota, título, ícone, papel mínimo)
// vive em lib/quick-access.ts — reaproveitado também por Configurações
// (Acessos rápidos) para o mesmo card poder ser habilitado/reordenado por
// usuário+empresa (ver hooks/use-workspace-preferences.ts).

// PARTE 6: ações rápidas — sempre para rotas já existentes (nenhum fluxo
// novo criado só para isso). Escondidas por completo para VIEWER (RN-010:
// papel somente leitura, ver lib/roles.ts).
function quickActionItems(id: string) {
  return [
    { href: `/organizations/${id}/financials`, icon: IconDollar, label: "Registrar receita/despesa" },
    { href: `/organizations/${id}/marketing`, icon: IconMegaphone, label: "Criar campanha" },
    { href: `/organizations/${id}/products`, icon: IconPackage, label: "Adicionar produto" },
    { href: `/organizations/${id}/experiments`, icon: IconFlask, label: "Criar experimento" },
    { href: `/organizations/${id}/reports`, icon: IconFileText, label: "Gerar relatório" },
  ];
}

const SUMMARY_CARDS: { key: "revenue" | "profit" | "margin" | "cac"; label: string; percent?: boolean; icon: typeof IconDollar }[] = [
  { key: "revenue", label: "Receita", icon: IconDollar },
  { key: "profit", label: "Lucro", icon: IconTrendingUp },
  { key: "margin", label: "Margem", percent: true, icon: IconGrid },
  { key: "cac", label: "CAC", icon: IconPackage },
];

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { organization, loading: orgLoading } = useOrganization();
  const { dashboard, revenueComparison, loading: dashboardLoading } = useDashboard(id, currentMonthPeriod());
  const { quickAccess, loading: quickAccessLoading } = useWorkspacePreferences(id);

  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenue, setRevenue] = useState("");
  const [profit, setProfit] = useState("");
  const [cac, setCac] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadBaselines(): Promise<Baseline[]> {
    return api.get<Baseline[]>(`/api/v1/organizations/${id}/baselines`);
  }

  useEffect(() => {
    let cancelled = false;
    loadBaselines()
      .then((history) => {
        if (!cancelled) setBaselines(history);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push(loginRedirectPath(err));
          return;
        }
        setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateBaseline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/api/v1/organizations/${id}/baselines`, {
        revenue: revenue ? Number(revenue) : null,
        profit: profit ? Number(profit) : null,
        cac: cac ? Number(cac) : null,
      });
      setRevenue("");
      setProfit("");
      setCac("");
      setBaselines(await loadBaselines());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel registrar o baseline.");
    } finally {
      setSubmitting(false);
    }
  }

  const showActions = canPerformActions(organization?.my_role);
  const quickAccessCards = visibleQuickAccess(organization?.my_role, quickAccess);

  // Único sinal derivado de dado real para o painel de atenção — a ausência
  // de baseline já é comunicada pelo empty state do histórico logo abaixo,
  // então não é repetida aqui (PARTE 7: "não criar regras arbitrárias sem
  // dados reais"; evitar redundância de mensagens).
  const revenueDropAlert =
    revenueComparison && revenueComparison.percent_change !== null && revenueComparison.percent_change < -0.05
      ? `Receita caiu ${Math.abs(revenueComparison.percent_change * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em relação ao baseline neste mês.`
      : null;

  return (
    <div className="animate-fade-in-up py-8">
      {/* Cabeçalho da empresa — PARTE 3. O nome já é o <h1> da sidebar (ver
          layout.tsx); aqui ele reaparece como texto estilizado, não como
          heading, para não duplicar o mesmo heading na página (um <h1> por
          página) nem quebrar `getByRole("heading", {name: orgName})` nos
          testes existentes, que já apontam para o da sidebar. */}
      <div className={`${card} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
              Você está em
            </p>
            {orgLoading ? (
              <Skeleton className="mt-1.5 h-7 w-48" />
            ) : (
              <p className="mt-0.5 truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {organization?.name}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {organization?.my_role && <Badge tone="blue">{roleLabel(organization.my_role)}</Badge>}
              {organization?.segment && <Badge tone="slate">{organization.segment}</Badge>}
              {organization?.tracking_start_date && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Dados desde {formatTrackingSince(organization.tracking_start_date)}
                </span>
              )}
            </div>
          </div>
          <Link href="/organizations" className={`shrink-0 text-sm ${linkClass}`}>
            Trocar empresa
          </Link>
        </div>
      </div>

      {/* Acesso rápido — PARTE 4. Ordem/visibilidade configuráveis em
          Configurações → Acessos rápidos (ver hooks/use-workspace-preferences.ts);
          skeleton evita esconder a seção inteira enquanto a preferência carrega. */}
      <section className="mt-6">
        <h2 className={sectionTitle}>Acesso rápido</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickAccessLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            : quickAccessCards.map((cardDef) => (
                <QuickAccessCard
                  key={cardDef.id}
                  href={quickAccessHref(id, cardDef)}
                  icon={cardDef.icon}
                  title={cardDef.title}
                  description={cardDef.description}
                />
              ))}
        </div>
      </section>

      {/* Ações rápidas — PARTE 6. Escondido por completo para VIEWER
          (somente leitura, RN-010) — não recebe atalho para ação que não
          pode executar. */}
      {showActions && (
        <section className="mt-6">
          <h2 className={sectionTitle}>Ações rápidas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickActionItems(id).map(({ href, icon: Icon, label: actionLabel }) => (
              <Link
                key={href}
                href={href}
                className={`${cardHover} inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200`}
              >
                <Icon className="h-4 w-4 text-slate-400" />
                {actionLabel}
              </Link>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      )}

      {/* Histórico de baseline — conteúdo já existente antes do redesign,
          preservado sem mudança de rótulos/textos (testes e2e dependem
          deles: "Nenhum baseline registrado ainda.", label "Receita",
          botão "Registrar baseline"). */}
      <section id="registrar-baseline" className="mt-8">
        <div className="flex items-center gap-2">
          <IconClock className="h-4 w-4 text-slate-400" />
          <h2 className={sectionTitle}>Historico de baseline</h2>
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : baselines.length === 0 ? (
            <EmptyState
              icon={<IconTrendingUp className="h-5 w-5" />}
              title="Nenhum baseline registrado ainda."
              description="Registre o primeiro abaixo para acompanhar a evolução do negócio ao longo do tempo."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {baselines.map((b, i) => (
                <li key={b.id}>
                  <Card
                    className="px-4 py-3 text-sm animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                  >
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{new Date(b.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 font-medium text-slate-900 dark:text-slate-50">
                      <span>Receita: {formatNumber(b.revenue)}</span>
                      <span>Lucro: {formatNumber(b.profit)}</span>
                      <span>CAC: {formatNumber(b.cac)}</span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Card className="mt-8 p-5">
        <div className="flex items-center gap-2">
          <IconGrid className="h-4 w-4 text-slate-400" />
          <h2 className={sectionTitle}>Registrar novo baseline</h2>
        </div>
        <form onSubmit={handleCreateBaseline} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={label}>
              Receita
              <input
                type="number"
                step="0.01"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className={input}
              />
            </label>
            <label className={label}>
              Lucro
              <input
                type="number"
                step="0.01"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                className={input}
              />
            </label>
            <label className={label}>
              CAC
              <input
                type="number"
                step="0.01"
                value={cac}
                onChange={(e) => setCac(e.target.value)}
                className={input}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Campos deixados em branco ficam registrados como &quot;nao disponivel&quot;, nunca como
            zero.
          </p>
          <button type="submit" disabled={submitting} className={`${buttonPrimary} self-start`}>
            {submitting ? "Salvando..." : "Registrar baseline"}
          </button>
        </form>
      </Card>

      {/* Resumo de KPIs — PARTE 5. Reusa o mesmo hook/endpoint do Dashboard
          dedicado (useDashboard), sem duplicar a lógica de busca. */}
      <section className="mt-8">
        <h2 className={sectionTitle}>Resumo do mês</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {dashboardLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            : dashboard &&
              SUMMARY_CARDS.map(({ key, label: metricLabel, percent, icon: Icon }) => {
                const metric = dashboard[key];
                return (
                  <Card key={key} className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {metricLabel}
                      </p>
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                      {formatMetric(metric, { percent })}
                    </p>
                  </Card>
                );
              })}
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          <Link href={`/organizations/${id}/dashboard`} className={linkClass}>
            Ver indicadores completos, com filtro de período
          </Link>
        </p>
      </section>

      {/* Alertas — PARTE 7. Só aparece quando há um sinal real derivado de
          dado já buscado; nunca um alerta fabricado. Mantido logo abaixo do
          Resumo do mês (não em outro lugar da página) porque deriva da
          mesma comparação de baseline dos KPIs acima. */}
      {revenueDropAlert && (
        <section className="mt-6">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <IconTrendingDown className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Atenção</p>
              <p className="mt-0.5">{revenueDropAlert}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
