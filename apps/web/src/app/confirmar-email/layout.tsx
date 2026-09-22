import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Confirmar e-mail" };

export default function ConfirmEmailLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
