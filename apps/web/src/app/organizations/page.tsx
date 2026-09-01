"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonGhost, buttonPrimary, buttonSecondary, card, input, label, pageContainer } from "@/lib/ui";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import { CompanyCard } from "@/components/company-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  IconAlertCircle,
  IconLogOut,
  IconMail,
  IconPlus,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
} from "@/components/icons";
import { currentMonthPeriod, type OrganizationSummary } from "@/lib/metrics";
import type { Organization, OrganizationPage, OrganizationStatus, User } from "@/lib/types";

// Abaixo desse número de empresas, a busca só adiciona ruído visual sem
// ajudar em nada (Parte "Busca e organização" do prompt de redesign:
// "não adicionar complexidade desnecessária caso haja poucas empresas").
// `initialTotal` só cresce (nunca diminui) depois de capturado: sem isso,
// (a) uma busca que reduz o resultado a poucos itens faria a própria caixa
// de busca sumir, e (b) um usuário novo (0 empresas na primeiríssima carga)
// nunca veria a busca aparecer nesta mesma sessão, mesmo depois de cadastrar
// dezenas de empresas — só um reload recalcularia do zero.
const SEARCH_THRESHOLD = 6;
const PAGE_SIZE = 24;

type StatusFilter = OrganizationStatus | "all";

const STATUS_TAB_VALUES: StatusFilter[] = ["active", "frozen", "all"];

function fetchOrganizationsPage(params: {
  search: string;
  status: StatusFilter;
  offset: number;
}): Promise<OrganizationPage> {
  const query = new URLSearchParams({
    status: params.status,
    limit: String(PAGE_SIZE),
    offset: String(params.offset),
  });
  if (params.search.trim()) query.set("search", params.search.trim());
  return api.get<OrganizationPage>(`/api/v1/organizations?${query.toString()}`);
}

function fetchSummariesFor(organizationIds: string[]): Promise<OrganizationSummary[]> {
  if (organizationIds.length === 0) return Promise.resolve([]);
  const query = new URLSearchParams({ period: currentMonthPeriod() });
  for (const id of organizationIds) query.append("organization_id", id);
  return api.get<OrganizationSummary[]>(`/api/v1/organizations/summary?${query.toString()}`);
}

export default function OrganizationsPage() {
  const router = useRouter();
  const t = useTranslations("organizations.list");
  const tCommon = useTranslations("common");
  const statusTabLabels: Record<StatusFilter, string> = {
    active: t("statusTabs.active"),
    frozen: t("statusTabs.frozen"),
    all: t("statusTabs.all"),
  };
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  // null até a primeira carga resolver — ver SEARCH_THRESHOLD acima.
  const [initialTotal, setInitialTotal] = useState<number | null>(null);
  // Indicadores rápidos por empresa (Receita/Leads/Conversão/CAC), por
  // organization_id — dado complementar: se essa chamada falhar, os cards
  // continuam mostrando o resto normalmente, sem indicador nenhum.
  const [summaries, setSummaries] = useState<Record<string, OrganizationSummary>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const debouncedQuery = useDebouncedValue(query);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendDevToken, setResendDevToken] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.push(loginRedirectPath(err));
        return true;
      }
      return false;
    },
    [router]
  );

  const loadFirstPage = useCallback(
    async (search: string, status: StatusFilter) => {
      setLoading(true);
      setLoadError(null);
      let page: OrganizationPage;
      try {
        page = await fetchOrganizationsPage({ search, status, offset: 0 });
      } catch (err) {
        if (handleAuthError(err)) return;
        setLoadError(err instanceof ApiError ? err.message : t("connectionError"));
        setLoading(false);
        return;
      }
      setItems(page.items);
      setTotal(page.total);
      setInitialTotal((prev) => (prev === null ? page.total : Math.max(prev, page.total)));
      setLoading(false);

      // Resumo (dado complementar) buscado à parte — uma falha aqui não
      // deve derrubar a tela inteira nem atrasar a lista em si.
      try {
        const summaryList = await fetchSummariesFor(page.items.map((org) => org.id));
        setSummaries((prev) => ({
          ...prev,
          ...Object.fromEntries(summaryList.map((s) => [s.organization_id, s])),
        }));
      } catch {
        // Silencioso de propósito — ver comentário do estado `summaries` acima.
      }
    },
    // tCommon (useTranslations) não é referencialmente estável entre renders —
    // incluí-la aqui recriaria loadFirstPage a cada render, o que por sua vez
    // reexecutaria o useEffect abaixo (que depende de loadFirstPage) em loop
    // infinito, já que ele mesmo dispara um novo render via setLoading/setItems.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleAuthError]
  );

  useEffect(() => {
    // A conta de usuário só precisa ser buscada uma vez.
    api
      .get<User>("/api/v1/auth/me")
      .then(setUser)
      .catch((err: unknown) => {
        handleAuthError(err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // loadFirstPage é async, mas `setLoading(true)`/`setLoadError(null)`
    // (seu primeiro trecho) rodam de forma síncrona ao chamar a função —
    // adiado em uma microtask pro corpo do efeito nunca disparar setState
    // sincronamente (mesmo padrão já usado em outros efeitos do projeto).
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadFirstPage(debouncedQuery, statusFilter);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, statusFilter, loadFirstPage]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const page = await fetchOrganizationsPage({
        search: debouncedQuery,
        status: statusFilter,
        offset: items.length,
      });
      setItems((prev) => [...prev, ...page.items]);
      setTotal(page.total);
      const summaryList = await fetchSummariesFor(page.items.map((org) => org.id));
      setSummaries((prev) => ({
        ...prev,
        ...Object.fromEntries(summaryList.map((s) => [s.organization_id, s])),
      }));
    } catch (err) {
      if (!handleAuthError(err)) {
        setLoadError(err instanceof ApiError ? err.message : t("connectionError"));
      }
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await api.post<Organization>("/api/v1/organizations", { name });
      setName("");
      // Recarrega do zero em vez de inserir localmente — mais simples e
      // sempre reflete a ordenação/paginação de verdade do servidor.
      await loadFirstPage(debouncedQuery, statusFilter);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : t("createGenericError"));
    } finally {
      setCreating(false);
    }
  }

  async function handleResendVerification() {
    if (!user) return;
    setResending(true);
    setResendMessage(null);
    setResendDevToken(null);
    try {
      const res = await api.post<{ message: string; dev_token?: string }>(
        "/api/v1/auth/resend-verification",
        { email: user.email }
      );
      setResendMessage(res.message);
      setResendDevToken(res.dev_token ?? null);
    } catch (err) {
      setResendMessage(err instanceof ApiError ? err.message : t("resendGenericError"));
    } finally {
      setResending(false);
    }
  }

  async function handleLogout() {
    await api.post("/api/v1/auth/logout");
    router.push("/login");
  }

  const hasMore = items.length < total;
  const showSearch = initialTotal !== null && initialTotal > SEARCH_THRESHOLD;

  if (loadError && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-600/30 animate-scale-in">
          <IconAlertCircle className="h-7 w-7" />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("loadErrorTitle")}</h1>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
        </div>
        <button onClick={() => void loadFirstPage(debouncedQuery, statusFilter)} className={`${buttonPrimary} mt-1`}>
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className={pageContainer}>
      <div className="flex items-start justify-between gap-4">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {t("title")}
          </h1>
          {user && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("loggedInAsPrefix")}{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">{user.name}</span> ({user.email})
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {user?.is_platform_admin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-violet-500 to-violet-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-violet-600/20 transition-all hover:from-violet-500 hover:to-violet-700"
            >
              <IconShieldCheck className="h-4 w-4" /> {t("adminPanel")}
            </Link>
          )}
          <button onClick={handleLogout} className={buttonGhost}>
            <IconLogOut className="h-4 w-4" /> {t("signOut")}
          </button>
        </div>
      </div>

      {user && !user.email_verified && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="inline-flex items-center gap-2">
            <IconMail className="h-4 w-4 shrink-0" />
            {t("confirmEmailBanner", { email: user.email })}
          </span>
          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={resending}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
          >
            {resending ? t("resending") : t("resendVerification")}
          </button>
          {resendMessage && (
            <p className="w-full break-all text-xs text-amber-700 dark:text-amber-400">
              {resendMessage}
              {resendDevToken && (
                <>
                  {" "}
                  <Link
                    href={`/confirmar-email?token=${encodeURIComponent(resendDevToken)}`}
                    className="underline"
                  >
                    {t("resendDevModeLink")}
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("statusTabs.groupLabel")} className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          {STATUS_TAB_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={statusFilter === value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === value
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {statusTabLabels[value]}
            </button>
          ))}
        </div>

        {showSearch && (
          <label className="relative block w-full max-w-sm sm:w-auto">
            <span className="sr-only">{t("searchLabel")}</span>
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`${input} pl-9`}
            />
          </label>
        )}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full hidden lg:block" />
          </div>
        ) : items.length === 0 && !debouncedQuery.trim() && statusFilter === "active" ? (
          <EmptyState
            icon={<IconSparkles className="h-5 w-5" />}
            title={t("emptyNoOrganizations.title")}
            description={t("emptyNoOrganizations.description")}
          />
        ) : items.length === 0 && debouncedQuery.trim() ? (
          <EmptyState
            icon={<IconSearch className="h-5 w-5" />}
            title={t("emptySearch.title", { query: debouncedQuery.trim() })}
            description={t("emptySearch.description")}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<IconSparkles className="h-5 w-5" />}
            title={t("emptyFilter.title")}
            description={t("emptyFilter.description")}
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((org, i) => (
                <li key={org.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <CompanyCard organization={org} summary={summaries[org.id]} />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span>{t("showingCount", { shown: items.length, total })}</span>
                <button
                  type="button"
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                  className={buttonSecondary}
                >
                  {loadingMore ? tCommon("loading") : t("loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {createError && (
        <div className="mt-6">
          <Alert>{createError}</Alert>
        </div>
      )}

      <div className={`${card} mt-8 p-5`}>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("addNewTitle")}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("addNewDescription")}</p>
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={`flex-1 ${label}`}>
            {t("newOrganizationLabel")}
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("newOrganizationPlaceholder")}
              className={input}
            />
          </label>
          <button type="submit" disabled={creating} className={buttonPrimary}>
            <IconPlus className="h-4 w-4" />
            {creating ? t("creating") : t("create")}
          </button>
        </form>
      </div>
    </div>
  );
}
