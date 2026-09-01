"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Organization } from "@/lib/types";

// Compartilha o `Organization` já buscado pelo layout (para a sidebar) com
// as páginas dentro dele — evita uma segunda chamada a
// `GET /organizations/{id}` só para mostrar nome/papel/segmento no cabeçalho
// da página inicial da empresa (PARTE 15 do prompt de redesign de UX,
// 2026-08-27: "evitar... chamadas duplicadas").
export interface OrganizationContextValue {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  // Permite que uma página filha (hoje só `configuracoes`, após PATCH/
  // freeze/reactivate/logo) empurre a organização atualizada de volta para
  // o layout — sem isso, o banner de "empresa encerrada" e a sidebar
  // (nome/logo) só refletiriam a mudança depois de um refetch completo
  // (troca de `id`/reload), já que o layout busca a organização uma única
  // vez por `id`, não a cada navegação interna.
  onOrganizationUpdate: (organization: Organization) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({
  value,
  children,
}: {
  value: OrganizationContextValue;
  children: ReactNode;
}) {
  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization deve ser usado dentro de um OrganizationProvider");
  }
  return ctx;
}
