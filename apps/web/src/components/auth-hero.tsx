import { IconFlask, IconFunnel, IconTrendingUp } from "@/components/icons";

const POINTS = [
  { icon: IconTrendingUp, text: "Baselines e dashboards por cliente, sempre isolados" },
  { icon: IconFunnel, text: "Funil completo: impressão até recompra" },
  { icon: IconFlask, text: "Experimentos de CRO com significância estatística real" },
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
  return (
    <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14">
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute bottom-[-6rem] right-[-6rem] h-96 w-96 rounded-full bg-sky-300/20 blur-3xl"
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

      <div className="relative animate-fade-in-up text-sm font-semibold tracking-wide text-blue-100">
        Marketing Analytics, Growth &amp; BI Platform
      </div>

      <div className="relative animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <p className="text-sm font-medium uppercase tracking-wider text-blue-200">{eyebrow}</p>
        <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-blue-100">{description}</p>

        <ul className="mt-8 flex flex-col gap-3">
          {POINTS.map(({ icon: Icon, text }, i) => (
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
          ))}
        </ul>
      </div>

      <div className="relative h-4" />
    </div>
  );
}
