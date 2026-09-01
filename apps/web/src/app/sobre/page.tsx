import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand-logo";
import { AccordionItem } from "@/components/accordion-item";
import {
  IconArrowLeft,
  IconGrid,
  IconTrendingUp,
  IconPackage,
  IconDollar,
  IconMegaphone,
  IconFunnel,
  IconFlask,
  IconFileText,
  IconShieldCheck,
  IconBookOpen,
  IconCheckCircle,
  IconAlertCircle,
  IconClock,
  IconUser,
  IconLock,
} from "@/components/icons";
import { buttonPrimary, buttonSecondary, card, cardHover, link as linkClass, sectionTitle } from "@/lib/ui";

// Página pública (sem autenticação), acessível a partir do /login — seção 1-2
// do prompt de criação da página Sobre/FAQ. Fica fora do grupo de rotas
// autenticadas de propósito, no mesmo nível de /login, /register etc., que
// já vivem direto sob o layout raiz (sem sidebar/gate de sessão).
//
// Todo o conteúdo abaixo foi levantado por análise real do código (não
// inventado): docs/product/vision.md, NAV_ITEMS de
// organizations/[id]/layout.tsx, os modelos de role/membership, o motor de
// métricas e o catálogo de 19 métricas do glossário interno, o stack de
// dependências de apps/web e apps/api, e o CHANGELOG. Itens que só existem
// como documentação/arquitetura planejada (ex.: Power BI) são apresentados
// como tal, nunca como recurso disponível hoje.
//
// Metadados (title/description) ficam sempre em português — cópia de SEO
// para o mercado PT, não faz parte do texto traduzido pelo seletor de
// idioma (decisão documentada em docs/i18n/README.md).
export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça a Lucratix: o que a plataforma faz, como ela ajuda a organizar o resultado dos seus clientes e as perguntas mais comuns antes de criar sua conta.",
};

// Ícones não são serializáveis em JSON — ficam em arrays paralelos por
// índice, zipados com o texto traduzido (messages/*.json, namespace
// "home.about") na hora de renderizar.
const BENEFIT_ICONS = [IconShieldCheck, IconTrendingUp, IconBookOpen, IconAlertCircle, IconClock] as const;

const FEATURE_ICONS = [
  IconGrid,
  IconTrendingUp,
  IconPackage,
  IconDollar,
  IconMegaphone,
  IconFunnel,
  IconFlask,
  IconFileText,
  IconShieldCheck,
  IconBookOpen,
] as const;

type TitleText = { title: string; text: string };
type TechGroup = { title: string; items: string[] };
type GlossaryEntry = { term: string; text: string };
type FaqEntry = { q: string; a: string };

export default function AboutPage() {
  const t = useTranslations("home.about");
  const benefits = t.raw("benefits") as TitleText[];
  const features = t.raw("features") as TitleText[];
  const strengths = t.raw("strengths") as string[];
  const steps = t.raw("steps") as TitleText[];
  const techGroups = t.raw("techGroups") as TechGroup[];
  const glossary = t.raw("glossary") as GlossaryEntry[];
  const faq = t.raw("faq") as FaqEntry[];

  return (
    <div className="flex flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <IconArrowLeft className="h-4 w-4" />
          {t("backToLogin")}
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className={buttonSecondary}>
            {t("signIn")}
          </Link>
          <Link href="/register" className={buttonPrimary}>
            {t("signUp")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#001640] via-[#012a6b] to-[#0052e0] px-4 py-16 text-center sm:px-6 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-2xl">
          <BrandLogo variant="mark" priority className="mx-auto h-auto w-[120px] drop-shadow-2xl sm:w-[150px]" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t("heroTitle")}</h1>
          <p className="mt-4 text-base leading-relaxed text-blue-100 sm:text-lg">{t("heroDescription")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#como-funciona" className={buttonPrimary}>
              {t("heroCtaHow")}
            </a>
            <a href="#faq" className={`${buttonSecondary} bg-white/10 text-white hover:bg-white/20`}>
              {t("heroCtaFaq")}
            </a>
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-16 sm:px-6">
        {/* O que é */}
        <section>
          <h2 className={sectionTitle}>{t("whatIsTitle")}</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("whatIsParagraph1")}</p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t("whatIsParagraph2")}</p>
          </div>
        </section>

        {/* Como ajuda */}
        <section>
          <h2 className={sectionTitle}>{t("howHelpsTitle")}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {benefits.map(({ title, text }, i) => {
              const Icon = BENEFIT_ICONS[i];
              return (
                <div key={title} className={`${card} flex gap-3 p-4`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades">
          <h2 className={sectionTitle}>{t("featuresTitle")}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ title, text }, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div key={title} className={`${cardHover} p-4`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pontos fortes */}
        <section>
          <h2 className={sectionTitle}>{t("strengthsTitle")}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {strengths.map((text) => (
              <li key={text} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* Como funciona */}
        <section id="como-funciona">
          <h2 className={sectionTitle}>{t("howItWorksTitle")}</h2>
          <ol className="mt-3 flex flex-col gap-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Tecnologias */}
        <section>
          <h2 className={sectionTitle}>{t("techTitle")}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("techSubtitle")}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {techGroups.map((group) => (
              <div key={group.title} className={`${card} p-4`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {group.title}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Glossário */}
        <section id="glossario">
          <div className="flex items-center gap-2">
            <IconBookOpen className="h-4 w-4 text-slate-400" />
            <h2 className={sectionTitle}>{t("glossaryTitle")}</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("glossarySubtitle")}</p>
          <div className="mt-3 flex flex-col gap-2">
            {glossary.map((entry) => (
              <AccordionItem key={entry.term} title={entry.term}>
                {entry.text}
              </AccordionItem>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq">
          <div className="flex items-center gap-2">
            <IconUser className="h-4 w-4 text-slate-400" />
            <h2 className={sectionTitle}>{t("faqTitle")}</h2>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {faq.map((entry) => (
              <AccordionItem key={entry.q} title={entry.q}>
                {entry.a}
              </AccordionItem>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className={`${card} flex flex-col items-center gap-4 p-8 text-center sm:p-10`}>
          <IconLock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{t("ctaTitle")}</h2>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t("ctaSubtitle")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={buttonPrimary}>
              {t("ctaCreateAccount")}
            </Link>
            <Link href="/login" className={linkClass}>
              {t("ctaAlreadyHaveAccount")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <p>© {new Date().getFullYear()} Lucratix.</p>
        <Link href="/login" className="mt-1 inline-block underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      </footer>
    </div>
  );
}
