import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
