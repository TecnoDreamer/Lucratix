import type { HTMLAttributes, ReactNode } from "react";
import { card, cardHover } from "@/lib/ui";
import { IconAlertCircle, IconCheckCircle } from "@/components/icons";

export function Card({
  hover,
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={`${hover ? cardHover : card} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: ReactNode;
}) {
  const isError = tone === "error";
  return (
    <p
      role={isError ? "alert" : undefined}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm animate-fade-in-up ${
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      }`}
    >
      {isError ? (
        <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{children}</span>
    </p>
  );
}

export function Badge({
  tone = "blue",
  children,
}: {
  tone?: "blue" | "slate";
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        tone === "blue"
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      {icon && (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-shimmer animate-shimmer rounded-md ${className}`} />;
}

export function PageLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-10 sm:px-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
