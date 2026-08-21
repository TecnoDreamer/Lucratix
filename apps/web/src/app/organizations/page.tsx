"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Organization, User } from "@/lib/types";

export default function OrganizationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const me = await api.get<User>("/api/v1/auth/me");
        setUser(me);
        const orgs = await api.get<Organization[]>("/api/v1/organizations");
        setOrganizations(orgs);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Nao foi possivel conectar a API.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const org = await api.post<Organization>("/api/v1/organizations", { name });
      setOrganizations((prev) => [...prev, org]);
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel criar a empresa.");
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await api.post("/api/v1/auth/logout");
    router.push("/login");
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Suas empresas</h1>
          {user && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Logado como {user.name} ({user.email})
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Sair
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {organizations.length === 0 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">
            Nenhuma empresa ainda. Cadastre a primeira abaixo.
          </li>
        )}
        {organizations.map((org) => (
          <li key={org.id}>
            <Link
              href={`/organizations/${org.id}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{org.name}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{org.my_role}</span>
            </Link>
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleCreate}
        className="mt-8 flex items-end gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Nova empresa
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da empresa/cliente"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {creating ? "Criando..." : "Criar"}
        </button>
      </form>
    </div>
  );
}
