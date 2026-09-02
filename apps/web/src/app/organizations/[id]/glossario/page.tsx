"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { METRIC_DEFINITIONS } from "@/domain/metrics/metric-definitions";
import type { MetricCategory, MetricDefinition } from "@/domain/metrics/metric-types";
import {
  ALPHABET,
  filterMetricsByCategory,
  groupMetricsByLetter,
  searchMetrics,
  useMetricCategoryLabels,
} from "@/domain/metrics/metric-utils";
import { card, input, sectionTitle } from "@/lib/ui";
import { EmptyState } from "@/components/ui";
import { IconBookOpen, IconChevronDown, IconSearch } from "@/components/icons";

const CATEGORY_VALUES: (MetricCategory | "all")[] = [
  "all",
  "financeiro",
  "marketing",
  "vendas",
  "clientes",
  "crescimento",
  "funil",
];

export default function GlossaryPage() {
  return (
    <Suspense>
      <GlossaryContent />
    </Suspense>
  );
}

function GlossaryContent() {
  const t = useTranslations("glossario");
  const categoryLabels = useMetricCategoryLabels();
  const searchParams = useSearchParams();
  const deepLinkMetric = searchParams.get("metric");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MetricCategory | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const filtered = useMemo(() => {
    const byCategory = filterMetricsByCategory(METRIC_DEFINITIONS, category);
    return searchMetrics(query, byCategory);
  }, [query, category]);

  const groups = useMemo(() => groupMetricsByLetter(filtered), [filtered]);
  const availableLetters = useMemo(() => new Set(groups.keys()), [groups]);

  useEffect(() => {
    if (!deepLinkMetric) return;
    let cancelled = false;
    let highlightTimeout: ReturnType<typeof setTimeout> | undefined;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setExpanded((prev) => new Set(prev).add(deepLinkMetric));
      setHighlighted(deepLinkMetric);
      itemRefs.current.get(deepLinkMetric)?.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightTimeout = setTimeout(() => {
        if (!cancelled) setHighlighted(null);
      }, 2200);
    });
    return () => {
      cancelled = true;
      clearTimeout(highlightTimeout);
    };
  }, [deepLinkMetric]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function scrollToLetter(letter: string) {
    const firstInGroup = groups.get(letter)?.[0];
    if (!firstInGroup) return;
    itemRefs.current.get(firstInGroup.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="animate-fade-in-up py-8">
      <div className="flex items-center gap-2">
        <IconBookOpen className="h-4 w-4 text-slate-400" />
        <h2 className={sectionTitle}>{t("title")}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
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

        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              aria-pressed={category === value}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {value === "all" ? t("categories.all") : categoryLabels[value]}
            </button>
          ))}
        </div>
      </div>

      <nav aria-label={t("alphabetNavLabel")} className="mt-3 flex flex-wrap gap-1">
        {ALPHABET.map((letter) => {
          const hasContent = availableLetters.has(letter);
          return (
            <button
              key={letter}
              type="button"
              disabled={!hasContent}
              onClick={() => scrollToLetter(letter)}
              className={`flex h-6 w-6 items-center justify-center rounded text-xs font-semibold transition-colors ${
                hasContent
                  ? "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  : "cursor-default text-slate-300 dark:text-slate-700"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </nav>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<IconSearch className="h-5 w-5" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {Array.from(groups.entries()).map(([letter, metrics]) => (
              <section key={letter}>
                <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400">{letter}</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {metrics.map((metric) => (
                    <li key={metric.id}>
                      <GlossaryItem
                        metric={metric}
                        categoryLabel={categoryLabels[metric.category]}
                        expanded={expanded.has(metric.id)}
                        highlighted={highlighted === metric.id}
                        onToggle={() => toggle(metric.id)}
                        itemRef={(el) => {
                          if (el) itemRefs.current.set(metric.id, el);
                          else itemRefs.current.delete(metric.id);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GlossaryItem({
  metric,
  categoryLabel,
  expanded,
  highlighted,
  onToggle,
  itemRef,
}: {
  metric: MetricDefinition;
  categoryLabel: string;
  expanded: boolean;
  highlighted: boolean;
  onToggle: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
}) {
  const t = useTranslations("glossario");
  const panelId = `glossary-panel-${metric.id}`;

  return (
    <div
      ref={itemRef}
      className={`${card} overflow-hidden transition-all duration-300 ${
        highlighted ? "border-blue-400 ring-4 ring-blue-500/20 dark:border-blue-500" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {metric.acronym ?? metric.name}
          </span>
          {metric.acronym && (
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">{metric.name}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:inline dark:bg-slate-800 dark:text-slate-400">
            {categoryLabel}
          </span>
          <IconChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-300">{metric.description}</p>
          {metric.formula && (
            <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {metric.formula}
            </p>
          )}
          {metric.example && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">{t("exampleLabel")}</span> {metric.example}
            </p>
          )}
          {metric.note && (
            <p className="mt-2 text-xs italic text-slate-400 dark:text-slate-500">{metric.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
