import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
