"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonGhost, buttonPrimary, card, input, label, pageContainer } from "@/lib/ui";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import { CompanyCard } from "@/components/company-card";
import { IconAlertCircle, IconLogOut, IconPlus, IconSearch, IconSparkles } from "@/components/icons";
import { currentMonthPeriod, type OrganizationSummary } from "@/lib/metrics";
import type { Organization, User } from "@/lib/types";

// Abaixo desse número de empresas, a busca só adiciona ruído visual sem
// ajudar em nada (Parte "Busca e organização" do prompt de redesign:
// "não adicionar complexidade desnecessária caso haja poucas empresas").
const SEARCH_THRESHOLD = 6;

export default function OrganizationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  // Indicadores rápidos por empresa (Receita/Leads/Conversão/CAC), por
  // organization_id — dado complementar: se essa chamada falhar, os cards
  // continuam mostrando o resto normalmente, sem indicador nenhum.
  const [summaries, setSummaries] = useState<Record<string, OrganizationSummary>>({});
  const [loading, setLoading] = useState(true);
  // Falha ao carregar a lista inicial (rede/servidor) — leva a tela inteira
  // a uma tela de retry dedicada em vez de mostrar a lista/formulário com
  // dado que sabemos estar incompleto (ver docs/auditoria/AUDITORIA_LAYOUT_PERFORMANCE.md,
  // "/" virou Server Component e não detecta mais API fora do ar; essa
  // distinção volta a existir aqui, no primeiro lugar que de fato busca dado).
  const [loadError, setLoadError] = useState<string | null>(null);
  // Falha ao criar uma empresa — erro pontual do formulário, não esconde a
  // lista já carregada com sucesso.
  const [createError, setCreateError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Independentes entre si: rodam em paralelo em vez de em fila.
      const [me, orgs] = await Promise.all([
        api.get<User>("/api/v1/auth/me"),
        api.get<Organization[]>("/api/v1/organizations"),
      ]);
      setUser(me);
      setOrganizations(orgs);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return;
      }
      // ApiError = servidor respondeu com um erro real (mensagem específica);
      // qualquer outro erro (fetch rejeitado) = API inalcançável.
      setLoadError(
        err instanceof ApiError ? err.message : "Não foi possível conectar ao servidor."
      );
      return;
    } finally {
      setLoading(false);
    }

    // Dado complementar, buscado à parte (só depois que a lista principal
    // já carregou com sucesso): uma falha aqui não deve derrubar a tela
    // inteira para a tela de erro, nem atrasar a lista em si.
    try {
      const summaryList = await api.get<OrganizationSummary[]>(
        `/api/v1/organizations/summary?period=${currentMonthPeriod()}`
      );
      setSummaries(Object.fromEntries(summaryList.map((s) => [s.organization_id, s])));
    } catch {
      // Silencioso de propósito — ver comentário do estado `summaries` acima.
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(() => void load());
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const org = await api.post<Organization>("/api/v1/organizations", { name });
      setOrganizations((prev) => [...prev, org]);
      setName("");
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Nao foi possivel criar a empresa.");
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await api.post("/api/v1/auth/logout");
    router.push("/login");
  }

  const filteredOrganizations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        (org.trade_name?.toLowerCase().includes(q) ?? false)
    );
  }, [organizations, query]);

  if (loadError && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-600/30 animate-scale-in">
          <IconAlertCircle className="h-7 w-7" />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Não foi possível carregar suas empresas
          </h1>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
        </div>
        <button onClick={() => void load()} className={`${buttonPrimary} mt-1`}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={pageContainer}>
      <div className="flex items-start justify-between gap-4">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Suas empresas
          </h1>
          {user && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Logado como <span className="font-medium text-slate-700 dark:text-slate-300">{user.name}</span>{" "}
              ({user.email})
            </p>
          )}
        </div>
        <button onClick={handleLogout} className={buttonGhost}>
          <IconLogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      {!loading && organizations.length > SEARCH_THRESHOLD && (
        <label className="relative mt-6 block max-w-sm">
          <span className="sr-only">Buscar empresa</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar empresa..."
            className={`${input} pl-9`}
          />
        </label>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full hidden lg:block" />
          </div>
        ) : organizations.length === 0 ? (
          <EmptyState
            icon={<IconSparkles className="h-5 w-5" />}
            title="Nenhuma empresa ainda. Cadastre a primeira abaixo."
            description="Cada empresa/cliente tem seus próprios dados, métricas e histórico, totalmente isolados dos demais."
          />
        ) : filteredOrganizations.length === 0 ? (
          <EmptyState
            icon={<IconSearch className="h-5 w-5" />}
            title="Nenhuma empresa encontrada."
            description="Tente outro termo de busca."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrganizations.map((org, i) => (
              <li key={org.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                <CompanyCard organization={org} summary={summaries[org.id]} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {createError && (
        <div className="mt-6">
          <Alert>{createError}</Alert>
        </div>
      )}

      <div className={`${card} mt-8 p-5`}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Adicionar nova empresa</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Cada empresa/cliente cadastrada aqui recebe seu próprio espaço, isolado dos demais.
        </p>
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={`flex-1 ${label}`}>
            Nova empresa
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da empresa/cliente"
              className={input}
            />
          </label>
          <button type="submit" disabled={creating} className={buttonPrimary}>
            <IconPlus className="h-4 w-4" />
            {creating ? "Criando..." : "Criar"}
          </button>
        </form>
      </div>
    </div>
  );
}
