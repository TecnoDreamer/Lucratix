"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { card, link as linkClass, sectionTitle } from "@/lib/ui";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import { IconBuilding, IconChevronRight } from "@/components/icons";
import type { PlatformOrganization } from "@/lib/platform-admin";

export default function AdminOrganizationsPage() {
  const t = useTranslations("admin.organizations");
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PlatformOrganization[]>("/api/v1/platform/organizations")
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t("loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // t (tradutor) omitido de propósito: nunca é referencialmente estável
    // entre renders — ver nota em organizations/page.tsx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-fade-in-up">
      <h2 className={sectionTitle}>{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-5">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : organizations.length === 0 ? (
          <EmptyState icon={<IconBuilding className="h-5 w-5" />} title={t("empty")} />
        ) : (
          <ul className={`${card} divide-y divide-slate-200 overflow-hidden dark:divide-slate-800`}>
            {organizations.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/admin/organizations/${org.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      {org.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t("ownerLine", {
                        hasOwner: org.owner_name ? "true" : "other",
                        ownerName: org.owner_name ?? "",
                        ownerEmail: org.owner_email ?? "",
                        count: org.member_count,
                      })}
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${linkClass}`}>
                    {t("manageMembers")} <IconChevronRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
