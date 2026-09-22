"use client";

import type { HTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";

/**
 * Card com rolagem horizontal (tabelas largas). Recebe foco por teclado e tem
 * nome acessível — sem isso, quem não usa mouse não consegue rolar a tabela
 * (regra `scrollable-region-focusable` do axe; auditoria de acessibilidade 3.3).
 */
export function ScrollableCard({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const t = useTranslations("common");
  return (
    <Card
      tabIndex={0}
      role="group"
      aria-label={t("scrollableTable")}
      className={`overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${className}`}
      {...rest}
    >
      {children}
    </Card>
  );
}
