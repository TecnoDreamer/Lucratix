"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { formatValue, type Product } from "@/lib/business";

async function fetchProducts(id: string): Promise<Product[]> {
  return api.get<Product[]>(`/api/v1/organizations/${id}/products?include_inactive=true`);
}

export default function ProductsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProducts(id)
      .then((result) => {
        if (!cancelled) setProducts(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Não foi possível conectar à API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const product = await api.post<Product>(`/api/v1/organizations/${id}/products`, {
        name,
        price: price ? Number(price) : null,
        cost: cost ? Number(cost) : null,
      });
      setProducts((prev) => [...prev, product]);
      setName("");
      setPrice("");
      setCost("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o produto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(product: Product) {
    try {
      const updated = await api.patch<Product>(
        `/api/v1/organizations/${id}/products/${product.id}`,
        { active: !product.active }
      );
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o produto.");
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-zinc-500">Carregando...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href={`/organizations/${id}`} className="text-sm text-zinc-500 underline dark:text-zinc-400">
        &larr; Voltar
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Produtos e serviços
      </h1>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <th className="py-2">Nome</th>
            <th className="py-2">Preço</th>
            <th className="py-2">Custo</th>
            <th className="py-2">Margem</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{p.name}</td>
              <td className="py-2">{formatValue(p.price)}</td>
              <td className="py-2">{formatValue(p.cost)}</td>
              <td className="py-2">
                {p.margin === null ? "não aplicável" : `${(p.margin * 100).toFixed(1)}%`}
              </td>
              <td className="py-2">
                <button
                  onClick={() => toggleActive(p)}
                  className="text-xs underline text-zinc-500 dark:text-zinc-400"
                >
                  {p.active ? "ativo" : "inativo"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        onSubmit={handleCreate}
        className="mt-8 flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Nome
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Preço
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Custo
          <input
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {submitting ? "Criando..." : "Adicionar"}
        </button>
      </form>
    </div>
  );
}
