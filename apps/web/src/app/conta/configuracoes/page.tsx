"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { buttonPrimary, buttonSecondary, card, label as labelClass, sectionTitle, select as selectClass } from "@/lib/ui";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import {
  IconChevronDown,
  IconChevronUp,
  IconMonitor,
  IconMoon,
  IconRotateCcw,
  IconSettings,
  IconSun,
} from "@/components/icons";
import { useAccount } from "@/contexts/account-context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ChangePasswordCard } from "@/components/change-password-card";
import { useWorkspacePreferences } from "@/hooks/use-workspace-preferences";
import { QUICK_ACCESS_CARDS, resolveQuickAccess, useQuickAccessLabels } from "@/lib/quick-access";
import { saveQuickAccess, restoreQuickAccessDefaults, type QuickAccessPreferenceItem } from "@/lib/workspace-preferences";

const THEME_VALUES: Theme[] = ["system", "light", "dark"];
const THEME_ICONS: Record<Theme, typeof IconSun> = { system: IconMonitor, light: IconSun, dark: IconMoon };

const CARDS_BY_ID = new Map(QUICK_ACCESS_CARDS.map((c) => [c.id, c]));

export default function AccountSettingsPage() {
  const t = useTranslations("account");
  // Comeca em "system" (mesmo valor que o servidor assume) e so le o real
  // valor salvo apos montar no cliente, para nao gerar erro de hidratacao —
  // localStorage nao existe durante o SSR.
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setThemeState(getStoredTheme());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelect(value: Theme) {
    setThemeState(value);
    setTheme(value);
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconSettings className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>

      {/* Agrupamento visual em 3 categorias (Preferências/Workspace/
          Segurança) — a página cresceu de 1 card pra 4, um rótulo por grupo
          deixa claro o que é pessoal/global (Preferências), por empresa
          (Workspace) e sensível (Segurança), sem precisar de abas/nav
          própria enquanto a lista não crescer muito mais. */}
      <h3 className={`${sectionTitle} mt-8`}>{t("groups.preferences")}</h3>

      <div className={`${card} mt-3 p-5`}>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("appearance.title")}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("appearance.description")}</p>

        <div role="radiogroup" aria-label={t("appearance.radiogroupLabel")} className="mt-4 grid grid-cols-3 gap-3">
          {THEME_VALUES.map((value) => {
            const optionLabel = t(`appearance.options.${value}`);
            const Icon = THEME_ICONS[value];
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors ${
                  selected
                    ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {optionLabel}
              </button>
            );
          })}
        </div>
      </div>

      <LocaleSwitcher />

      <h3 className={`${sectionTitle} mt-8`}>{t("groups.workspace")}</h3>

      <QuickAccessSettingsCard />

      <h3 className={`${sectionTitle} mt-8`}>{t("groups.security")}</h3>

      <ChangePasswordCard />
    </div>
  );
}

function QuickAccessSettingsCard() {
  const t = useTranslations("account.quickAccess");
  const quickAccessLabels = useQuickAccessLabels();
  const { organizations, activeOrganization, loading: accountLoading } = useAccount();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (selectedOrgId) return;
    const initial = activeOrganization?.id ?? organizations[0]?.id;
    if (!initial) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setSelectedOrgId(initial);
    });
    return () => {
      cancelled = true;
    };
  }, [activeOrganization, organizations, selectedOrgId]);

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const { quickAccess, loading: prefLoading, reload } = useWorkspacePreferences(selectedOrgId);

  const resolved = useMemo(
    () => resolveQuickAccess(selectedOrg?.my_role, quickAccess),
    [selectedOrg?.my_role, quickAccess]
  );

  const [items, setItems] = useState<QuickAccessPreferenceItem[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (prefLoading) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setItems(resolved.map((entry) => ({ id: entry.card.id, enabled: entry.enabled })));
      setDirty(false);
    });
    return () => {
      cancelled = true;
    };
    // resolved é recomputado a cada render (nova identidade de array); o
    // gatilho real de re-seed é o par (organização selecionada, preferência
    // recém-carregada), não a referência do array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefLoading, selectedOrgId]);

  function toggle(id: string) {
    if (!items) return;
    setItems(items.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)));
    setDirty(true);
  }

  function move(id: string, direction: -1 | 1) {
    if (!items) return;
    const index = items.findIndex((it) => it.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setItems(next);
    setDirty(true);
    const movedTitle = quickAccessLabels[id]?.title ?? id;
    setAnnouncement(t("movedAnnouncement", { title: movedTitle, position: target + 1, total: next.length }));
  }

  async function handleSave() {
    if (!items || !selectedOrgId) return;
    setSaving(true);
    setActionError(null);
    try {
      await saveQuickAccess(selectedOrgId, items);
      setDirty(false);
      setAnnouncement(t("savedAnnouncement"));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t("saveGenericError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    if (!selectedOrgId || !selectedOrg) return;
    setRestoring(true);
    setActionError(null);
    try {
      await restoreQuickAccessDefaults(selectedOrgId);
      const defaults = resolveQuickAccess(selectedOrg.my_role, null).map((entry) => ({
        id: entry.card.id,
        enabled: entry.enabled,
      }));
      setItems(defaults);
      setDirty(false);
      setAnnouncement(t("restoredAnnouncement"));
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t("restoreGenericError"));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className={`${card} mt-6 p-5`}>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t("title")}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      {!accountLoading && organizations.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={t("noOrganizations")} />
        </div>
      ) : (
        <>
          {organizations.length > 1 && (
            <label className={`${labelClass} mt-4`}>
              {t("organizationLabel")}
              <select
                className={selectClass}
                value={selectedOrgId ?? ""}
                onChange={(e) => setSelectedOrgId(e.target.value)}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {organizations.length === 1 && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t("appliedTo", { name: organizations[0].name })}
            </p>
          )}

          <div aria-live="polite" className="sr-only">
            {announcement}
          </div>

          {prefLoading || !items ? (
            <div className="mt-4 flex flex-col gap-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {items.map((item, index) => {
                const cardDef = CARDS_BY_ID.get(item.id);
                if (!cardDef) return null;
                const Icon = cardDef.icon;
                const title = quickAccessLabels[item.id]?.title ?? item.id;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    <label className="flex flex-1 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggle(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                      />
                      {t("showCard", { title })}
                    </label>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={t("moveUp", { title })}
                        disabled={index === 0}
                        onClick={() => move(item.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <IconChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("moveDown", { title })}
                        disabled={index === items.length - 1}
                        onClick={() => move(item.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <IconChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {actionError && (
            <div className="mt-3">
              <Alert>{actionError}</Alert>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!dirty || saving || !items}
              onClick={() => void handleSave()}
              className={buttonPrimary}
            >
              {saving ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              disabled={restoring || !selectedOrg}
              onClick={() => void handleRestore()}
              className={`${buttonSecondary} inline-flex items-center gap-1.5`}
            >
              <IconRotateCcw className="h-3.5 w-3.5" />
              {restoring ? t("restoring") : t("restoreDefault")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
