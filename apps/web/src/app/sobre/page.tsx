import type { Metadata } from "next";
import Link from "next/link";
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
export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça a Lucratix: o que a plataforma faz, como ela ajuda a organizar o resultado dos seus clientes e as perguntas mais comuns antes de criar sua conta.",
};

const BENEFITS = [
  {
    icon: IconShieldCheck,
    title: "Isolamento real entre clientes",
    text: "Cada empresa cadastrada é uma organização isolada: o dado de um cliente nunca aparece para outro. Isso é testado automaticamente, não é só uma promessa.",
  },
  {
    icon: IconTrendingUp,
    title: "Baseline que nunca é reescrito",
    text: "O histórico de cada cliente fica preservado. As comparações usam o período anterior real daquele cliente, não uma média genérica inventada.",
  },
  {
    icon: IconBookOpen,
    title: "Métrica com fórmula única",
    text: "ROAS, CAC, LTV e as demais métricas nascem de um único motor de cálculo, documentado no glossário — sem duas telas mostrando contas diferentes para o mesmo número.",
  },
  {
    icon: IconAlertCircle,
    title: "Transparência quando falta dado",
    text: "Se um período está incompleto, o sistema avisa em vez de mostrar um número parcial como se fosse o resultado final.",
  },
  {
    icon: IconClock,
    title: "Auditoria de cada mudança",
    text: "Alterações relevantes ficam registradas: quem fez, o quê e quando — trilha de auditoria, não só controle de permissão.",
  },
] as const;

const FEATURES = [
  { icon: IconGrid, title: "Dashboard", text: "Panorama do cliente em um só lugar: KPIs principais e comparação automática com o período anterior." },
  { icon: IconTrendingUp, title: "Analytics", text: "Visão executiva e de marketing por intervalo de datas livre, com ROAS, ROI, CTR, CPC, CPM, CPL e CPA." },
  { icon: IconPackage, title: "Produtos", text: "Catálogo de produtos por cliente, com margem calculada a partir da lista de preços cadastrada." },
  { icon: IconDollar, title: "Financeiro", text: "Receita, custo e lucro por período — a base de tudo o que aparece no dashboard e nos relatórios." },
  { icon: IconMegaphone, title: "Marketing", text: "Campanhas por canal, com investimento e retorno rastreados campanha a campanha." },
  { icon: IconFunnel, title: "Funil", text: "Da impressão à recompra: cada etapa do funil do cliente, com a taxa de conversão entre elas." },
  { icon: IconFlask, title: "Experimentos", text: "Testes de CRO com significância estatística real, não uma impressão sobre qual variante \"parece\" melhor." },
  { icon: IconFileText, title: "Relatório", text: "Relatório executivo pronto para apresentar ao cliente, com exportação em PDF pela função de impressão do navegador." },
  { icon: IconShieldCheck, title: "Auditoria", text: "Histórico de quem alterou o quê e quando, por organização." },
  { icon: IconBookOpen, title: "Glossário", text: "Todas as métricas do sistema explicadas em detalhe, com fórmula e exemplo — sem sigla misteriosa." },
] as const;

const STRENGTHS = [
  "Isolamento multi-tenant coberto por testes automatizados de segurança dedicados, não apenas por convenção de código.",
  "Sessão única por conta: entrar em um novo dispositivo revoga a sessão anterior automaticamente.",
  "Motor de métricas único — nenhuma tela recalcula uma fórmula por conta própria.",
  "Quatro papéis de acesso por organização (dono, administrador, analista, visualizador), cada um com permissões claras.",
  "Arquitetura de integrações futuras já documentada (ex.: Power BI), mesmo quando ainda não está disponível para uso.",
  "Coberto por testes automatizados de ponta a ponta e de backend a cada mudança, antes de qualquer publicação.",
] as const;

const STEPS = [
  { title: "Crie sua conta", text: "Nome, e-mail e senha — o cadastro é livre, sem necessidade de convite." },
  { title: "Cadastre sua primeira empresa", text: "Cada cliente que você atende vira uma organização isolada dentro da Lucratix." },
  { title: "Registre os dados do cliente", text: "Financeiro, campanhas de marketing, funil e produtos — a base de tudo o que vem depois." },
  { title: "Acompanhe dashboard e Analytics", text: "Com comparação automática contra o período anterior daquele mesmo cliente." },
  { title: "Gere o relatório executivo", text: "Leve o resultado pronto, em PDF, para a próxima conversa com o cliente." },
] as const;

const TECH_GROUPS = [
  { title: "Frontend", items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4"] },
  { title: "Backend", items: ["FastAPI", "SQLAlchemy 2.0", "Alembic"] },
  { title: "Banco de dados", items: ["PostgreSQL"] },
  { title: "Segurança", items: ["JWT", "Hash de senha com Argon2", "Sessão única por conta"] },
  { title: "Qualidade e testes", items: ["pytest", "Vitest", "Playwright", "ruff", "mypy"] },
] as const;

const GLOSSARY = [
  {
    term: "Organização",
    text: "Cada empresa/cliente que você cadastra na Lucratix. Todo dado — financeiro, campanhas, funil, produtos — pertence a uma organização e nunca é visível de outra.",
  },
  {
    term: "Baseline",
    text: "O período de referência de uma organização, preservado para sempre. As comparações de período (\"contra o mês anterior\", por exemplo) usam o histórico real do próprio cliente, nunca uma média inventada.",
  },
  {
    term: "Funil de conversão",
    text: "A sequência de etapas pela qual um cliente passa, da impressão do anúncio até a recompra, com a taxa de conversão calculada entre cada etapa.",
  },
  {
    term: "Experimento (CRO)",
    text: "Um teste comparando duas versões (A/B) de algo — uma página, uma oferta — avaliado com significância estatística, não por impressão.",
  },
  {
    term: "Papel (Role)",
    text: "O nível de acesso de uma pessoa dentro de uma organização: Dono (Owner), Administrador, Analista ou Visualizador — cada um enxergando e podendo fazer coisas diferentes.",
  },
  {
    term: "Auditoria",
    text: "O registro de quem alterou o quê e quando, por organização — usado para rastrear mudanças, não só para controlar quem tem permissão.",
  },
  {
    term: "Sessão única",
    text: "Cada conta mantém apenas uma sessão ativa por vez. Entrar em um novo dispositivo revoga automaticamente a sessão anterior.",
  },
  {
    term: "Comparação de período",
    text: "Todo indicador pode ser comparado contra o período anterior equivalente daquele mesmo cliente, com aviso explícito quando o período tem dado incompleto.",
  },
] as const;

const FAQ = [
  {
    q: "O que é a Lucratix?",
    a: "Uma plataforma de business intelligence e analytics para quem gerencia o marketing e o resultado de vários clientes ao mesmo tempo — cada cliente isolado em sua própria organização, com dashboard, funil, campanhas e relatórios conectados ao resultado financeiro real, não só a métricas de anúncio.",
  },
  {
    q: "Para quem a Lucratix foi criada?",
    a: "Para consultorias, agências e profissionais de marketing e growth que atendem mais de um cliente e precisam de uma visão organizada — e isolada — do resultado de cada um.",
  },
  {
    q: "Preciso de convite para me cadastrar?",
    a: "Não. O cadastro é livre: basta informar nome, e-mail e senha na tela de Cadastro.",
  },
  {
    q: "Cada cliente que eu atendo fica isolado dos demais?",
    a: "Sim. Cada cliente é uma organização separada dentro da Lucratix, e esse isolamento é coberto por testes automatizados de segurança — não depende apenas de cuidado manual.",
  },
  {
    q: "O que é \"baseline\" e por que ele importa?",
    a: "É o histórico preservado de cada cliente. Ele nunca é sobrescrito, então toda comparação de período usa o desempenho real anterior daquele mesmo cliente, em vez de uma média genérica.",
  },
  {
    q: "A Lucratix substitui o gerenciador de anúncios (Google Ads, Meta Ads)?",
    a: "Não. A Lucratix não cria nem gerencia campanhas de anúncio — ela reúne os resultados dessas campanhas e os conecta ao financeiro do cliente, para mostrar o que de fato converteu em resultado.",
  },
  {
    q: "Consigo gerar um relatório para apresentar ao cliente?",
    a: "Sim. A tela de Relatório monta um relatório executivo do período e oferece exportação em PDF através da função de impressão do navegador.",
  },
  {
    q: "O que significam os papéis Dono, Administrador, Analista e Visualizador?",
    a: "São os quatro níveis de acesso dentro de uma organização. De forma geral, o Visualizador acompanha dashboard e indicadores; o Analista também acessa Analytics e relatórios detalhados; Administrador e Dono, além disso, gerenciam a organização e quem tem acesso a ela.",
  },
  {
    q: "A Lucratix se integra com o Power BI?",
    a: "A arquitetura dessa integração já está documentada, mas ela ainda não está disponível para uso — depende de licenciamento que hoje não está configurado.",
  },
  {
    q: "Esqueci minha senha, como recupero o acesso?",
    a: "Na tela de login, use o link \"Esqueci minha senha\" para receber um link seguro de redefinição pelo e-mail cadastrado.",
  },
  {
    q: "A plataforma funciona bem no celular?",
    a: "Sim. As telas foram construídas com layout responsivo, incluindo a tela de login e cadastro.",
  },
  {
    q: "A Lucratix afirma que uma campanha \"causou\" um resultado?",
    a: "Não. As comparações de período mostram o que mudou e por quanto, sem atribuir causalidade a uma campanha específica — a leitura sobre o motivo da mudança continua sendo sua.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <IconArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className={buttonSecondary}>
            Entrar
          </Link>
          <Link href="/register" className={buttonPrimary}>
            Cadastre-se
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
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Seus clientes. Seus números. Uma única visão.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-blue-100 sm:text-lg">
            A Lucratix reúne baseline, funil, campanhas, produtos e financeiro de cada cliente que você atende — em
            organizações isoladas, com métricas calculadas de um jeito só, para orientar a próxima decisão em vez de
            só decorar um número.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#como-funciona" className={buttonPrimary}>
              Ver como funciona
            </a>
            <a href="#faq" className={`${buttonSecondary} bg-white/10 text-white hover:bg-white/20`}>
              Perguntas frequentes
            </a>
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-16 sm:px-6">
        {/* O que é */}
        <section>
          <h2 className={sectionTitle}>O que é a Lucratix</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              A Lucratix é uma plataforma de business intelligence e analytics voltada para quem cuida do marketing e
              do resultado de mais de um cliente ao mesmo tempo. Cada cliente vira uma organização própria, com seus
              dados completamente isolados dos demais, e a plataforma conecta o que aconteceu em campanhas e funil ao
              que de fato aconteceu no financeiro daquele cliente.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Ela não é um gerenciador de anúncios, não substitui ferramentas de automação de marketing, e não é um
              sistema fiscal ou contábil. O foco é outro: organizar o que já é registrado — baseline, campanhas,
              funil, produtos, financeiro — em um único lugar, com uma fórmula única para cada métrica e histórico que
              nunca é sobrescrito.
            </p>
          </div>
        </section>

        {/* Como ajuda */}
        <section>
          <h2 className={sectionTitle}>Como a Lucratix ajuda</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div key={title} className={`${card} flex gap-3 p-4`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades">
          <h2 className={sectionTitle}>Principais funcionalidades</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className={`${cardHover} p-4`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pontos fortes */}
        <section>
          <h2 className={sectionTitle}>Pontos fortes</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {STRENGTHS.map((text) => (
              <li key={text} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* Como funciona */}
        <section id="como-funciona">
          <h2 className={sectionTitle}>Como funciona</h2>
          <ol className="mt-3 flex flex-col gap-4">
            {STEPS.map((step, i) => (
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
          <h2 className={sectionTitle}>Tecnologias e ferramentas</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Para quem quer saber o que está por baixo do capô.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TECH_GROUPS.map((group) => (
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
            <h2 className={sectionTitle}>Glossário</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Os termos usados nesta página, explicados em uma frase. O glossário completo de métricas (ROAS, CAC, LTV
            e as demais) fica disponível dentro da conta, na seção Glossário de cada organização.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {GLOSSARY.map((entry) => (
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
            <h2 className={sectionTitle}>Perguntas frequentes</h2>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {FAQ.map((entry) => (
              <AccordionItem key={entry.q} title={entry.q}>
                {entry.a}
              </AccordionItem>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className={`${card} flex flex-col items-center gap-4 p-8 text-center sm:p-10`}>
          <IconLock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Pronto para organizar o resultado dos seus clientes?
          </h2>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
            O cadastro é livre e leva menos de um minuto — sem necessidade de convite.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={buttonPrimary}>
              Criar minha conta
            </Link>
            <Link href="/login" className={linkClass}>
              Já tenho conta — entrar
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <p>© {new Date().getFullYear()} Lucratix.</p>
        <Link href="/login" className="mt-1 inline-block underline-offset-4 hover:underline">
          Voltar ao login
        </Link>
      </footer>
    </div>
  );
}
