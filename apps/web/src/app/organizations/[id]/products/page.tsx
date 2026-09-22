"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError, loginRedirectPath } from "@/lib/api";
import { formatValue, type Product } from "@/lib/business";
import { formatPercentage } from "@/lib/formatters";
import { buttonPrimary, input, label, sectionTitle, tableHead, tableRow } from "@/lib/ui";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui";
import { IconPackage } from "@/components/icons";
import { ScrollableCard } from "@/components/scrollable-card";

async function fetchProducts(id: string): Promise<Product[]> {
  return api.get<Product[]>(`/api/v1/organizations/${id}/products?include_inactive=true`);
}

export default function ProductsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations("products");
  const tCommon = useTranslations("common");

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
          router.push(loginRedirectPath(err));
          return;
        }
        setError(err instanceof ApiError ? err.message : tCommon("genericConnectionError"));
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
      setError(err instanceof ApiError ? err.message : t("createGenericError"));
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
      setError(err instanceof ApiError ? err.message : t("updateGenericError"));
    }
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconPackage className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<IconPackage className="h-5 w-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <ScrollableCard>
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHead}>
                  <th className="px-4 py-2.5">{t("name")}</th>
                  <th className="px-4 py-2.5">{t("price")}</th>
                  <th className="px-4 py-2.5">{t("cost")}</th>
                  <th className="px-4 py-2.5">{t("margin")}</th>
                  <th className="px-4 py-2.5">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={tableRow}>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                      {p.name}
                    </td>
                    <td className="px-4 py-2.5">{formatValue(p.price, tCommon("notApplicable"))}</td>
                    <td className="px-4 py-2.5">{formatValue(p.cost, tCommon("notApplicable"))}</td>
                    <td className="px-4 py-2.5">
                      {p.margin === null ? tCommon("notApplicable") : formatPercentage(p.margin)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          p.active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {p.active ? t("active") : t("inactive")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableCard>
        )}
      </div>

      <Card className="mt-6 p-5">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <label className={label}>
            {t("name")}
            <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className={label}>
            {t("price")}
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${input} w-32`}
            />
          </label>
          <label className={label}>
            {t("cost")}
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={`${input} w-32`}
            />
          </label>
          <button type="submit" disabled={submitting} className={buttonPrimary}>
            {submitting ? t("creating") : t("add")}
          </button>
        </form>
      </Card>
    </div>
  );
}
