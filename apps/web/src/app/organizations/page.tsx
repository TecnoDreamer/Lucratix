"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { buttonGhost, buttonPrimary, cardHover, input, label, pageContainer } from "@/lib/ui";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import {
  IconAlertCircle,
  IconBuilding,
  IconChevronRight,
  IconLogOut,
  IconPlus,
  IconSparkles,
} from "@/components/icons";
import type { Organization, User } from "@/lib/types";

export default function OrganizationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
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
    } finally {
      setLoading(false);
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

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : organizations.length === 0 ? (
          <EmptyState
            icon={<IconSparkles className="h-5 w-5" />}
            title="Nenhuma empresa ainda. Cadastre a primeira abaixo."
            description="Cada empresa/cliente tem seus próprios dados, métricas e histórico, totalmente isolados dos demais."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {organizations.map((org, i) => (
              <li key={org.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  href={`/organizations/${org.id}`}
                  className={`${cardHover} group flex items-center justify-between gap-3 px-4 py-3.5`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <IconBuilding className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900 dark:text-slate-50">
                        {org.name}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{org.my_role}</span>
                    </span>
                  </span>
                  <IconChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
                </Link>
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

      <form
        onSubmit={handleCreate}
        className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:items-end"
      >
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
  );
}
