import { useTranslations } from "next-intl";
import { IconFlask, IconFunnel, IconTrendingUp } from "@/components/icons";
import { BrandLogo } from "@/components/brand-logo";

const POINT_ICONS = [IconTrendingUp, IconFunnel, IconFlask];

// Mini-dashboard demonstrativo do painel de marca — seção 12 do prompt de
// redesign. Ilustrativo, não são dados reais de nenhuma empresa (nem da
// Lucratix, que não vende para si mesma). Valores ficam sempre no formato
// pt-BR (não são reformatados por idioma — mesma regra de
// lib/formatters.ts, ver docs/i18n): só os rótulos são traduzidos.
const DEMO_KPI_VALUES = [
  { value: "R$ 185.420", delta: "+12,4%" },
  { value: "28,7%", delta: null },
  { value: "R$ 53.215", delta: "+9,1%" },
];

export function AuthHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  const t = useTranslations("authHero");
  const points = t.raw("points") as string[];
  const kpiLabels = t.raw("kpiLabels") as string[];

  return (
    <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-[#001640] via-[#012a6b] to-[#0052e0] lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14">
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute bottom-[-6rem] right-[-6rem] h-96 w-96 rounded-full bg-[color:var(--brand-glow)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Wordmark em texto, não imagem — abaixo de ~28px de altura o recorte
          do logo perde legibilidade (ver brand-logo.tsx); nesse tamanho o
          próprio guia da marca já recomenda texto estilizado com as cores da
          marca em vez do logo. */}
      <div className="relative animate-fade-in-up">
        <p className="text-2xl font-bold tracking-tight drop-shadow-lg">
          <span className="text-blue-400">Lucra</span>
          <span className="text-[color:var(--brand-glow)]">tix</span>
        </p>
      </div>

      <div className="relative animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="xl:flex xl:items-center xl:gap-8">
          <div className="xl:flex-1">
            <p className="text-sm font-medium uppercase tracking-wider text-blue-200">{eyebrow}</p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
              {title}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-100">{description}</p>
          </div>

          {/* Troféu completo — maior presença visual (seção 6-7 do prompt de
              layout). object-fit implícito do next/image com width/height
              reais preserva a proporção inteira, sem cortar/distorcer. */}
          <div
            className="relative mt-8 flex justify-center xl:mt-0 xl:block xl:shrink-0"
            aria-hidden
          >
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[color:var(--brand-glow)]/25 blur-3xl" />
            <BrandLogo
              variant="mark"
              priority
              className="trophy-mark h-auto w-[clamp(170px,14vw,300px)] drop-shadow-2xl"
            />
          </div>
        </div>

        <ul className="mt-8 flex flex-col gap-3">
          {points.map((text, i) => {
            const Icon = POINT_ICONS[i];
            return (
              <li
                key={text}
                className="flex items-center gap-3 animate-fade-in-up"
                style={{ animationDelay: `${140 + i * 70}ms` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-blue-50">{text}</span>
              </li>
            );
          })}
        </ul>

        <div
          className="relative mt-8 flex animate-fade-in-up gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"
          style={{ animationDelay: "360ms" }}
          aria-hidden
        >
          {DEMO_KPI_VALUES.map(({ value, delta }, i) => (
            <div key={kpiLabels[i]} className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                {kpiLabels[i]}
              </p>
              <p className="mt-1 text-base font-semibold text-white">{value}</p>
              {delta && (
                <p className="mt-0.5 text-[11px] font-medium text-[color:var(--brand-glow)]">
                  ↑ {delta}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="relative mt-2 text-[11px] text-blue-300/70" aria-hidden>
          {t("demoDataDisclaimer")}
        </p>
      </div>
    </div>
  );
}
