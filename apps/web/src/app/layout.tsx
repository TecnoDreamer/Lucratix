import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { ThemeWatcher } from "@/components/theme-watcher";
import { LocaleSync } from "@/components/locale-sync";
import { IdleLogoutWatcher } from "@/components/idle-logout-watcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Lucratix | Business Intelligence e Analytics",
    template: "%s | Lucratix",
  },
  description:
    "Lucratix: business intelligence, analytics e lucratividade por cliente — marketing analytics, growth e CRO conectados a resultado financeiro real.",
  applicationName: "Lucratix",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Idioma resolvido no servidor a partir do cookie NEXT_LOCALE (ver
  // src/i18n/request.ts) — nunca da URL. `<html lang>` reflete o idioma
  // de verdade (acessibilidade/SEO), independente de qualquer prefixo de
  // rota, que este app deliberadamente não tem (docs/adr/0009).
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Aplica o tema salvo antes da primeira pintura, evitando o "flash"
            de tema errado. Script estatico, sem interpolar dado externo. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeWatcher />
          <LocaleSync />
          <IdleLogoutWatcher />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
