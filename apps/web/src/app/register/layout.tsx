import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
