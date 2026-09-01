"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Organization } from "@/lib/types";

// Compartilha a lista de organizações do usuário (buscada uma vez pelo
// layout de /conta para resolver o "Voltar" — ver active-organization.ts)
// com as páginas dentro dele, mesmo espírito de organization-context.tsx:
// evitar uma segunda chamada a `GET /organizations` só para, por exemplo, a
// seção "Acessos rápidos" de Configurações montar o seletor de empresa.
export interface AccountContextValue {
  organizations: Organization[];
  activeOrganization: Organization | null;
  loading: boolean;
  error: string | null;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({
  value,
  children,
}: {
  value: AccountContextValue;
  children: ReactNode;
}) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount deve ser usado dentro de um AccountProvider");
  }
  return ctx;
}
