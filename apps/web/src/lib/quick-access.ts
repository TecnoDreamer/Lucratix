import { useTranslations } from "next-intl";
import { hasMinimumRole } from "@/lib/roles";
import type { MembershipRole } from "@/lib/types";
import type { QuickAccessPreferenceItem } from "@/lib/workspace-preferences";
import {
  IconDatabase,
  IconDollar,
  IconFlask,
  IconFunnel,
  IconMegaphone,
  IconPackage,
  IconTrendingUp,
} from "@/components/icons";

export interface QuickAccessCardDef {
  id: string;
  segment: string;
  icon: typeof IconTrendingUp;
  minRole?: MembershipRole;
}

// Registro de atalhos da Home — PARTE 4 do prompt de redesign de UX
// (2026-08-27): atalhos principais, não todos os módulos da sidebar. `id`
// é o mesmo valor que `segment` (estável, já visível na URL) — mantido como
// campo separado porque é ele que trafega para o backend/preferência salva,
// enquanto `segment` é usado para montar o href; nunca renomeie um `id` já
// em uso sem migrar as preferências salvas. `title`/`description` NÃO
// ficam aqui (i18n, 2026-09-01) — vêm de `useQuickAccessLabels()` abaixo,
// por chave `id` em messages/*.json (namespace `workspace.quickAccessCards`).
// `minRole`: mesmo critério da sidebar. Ao adicionar um card aqui, atualize
// também `QUICK_ACCESS_CARD_IDS` em
// apps/api/app/modules/workspace_preferences/registry.py (allow-list do
// backend) — as duas listas precisam ficar em sincronia.
export const QUICK_ACCESS_CARDS: readonly QuickAccessCardDef[] = [
  { id: "analytics", segment: "analytics", icon: IconTrendingUp, minRole: "ANALYST" },
  { id: "financials", segment: "financials", icon: IconDollar },
  { id: "marketing", segment: "marketing", icon: IconMegaphone },
  { id: "funnel", segment: "funnel", icon: IconFunnel },
  { id: "products", segment: "products", icon: IconPackage },
  { id: "experiments", segment: "experiments", icon: IconFlask },
  { id: "central-de-dados", segment: "central-de-dados", icon: IconDatabase },
];

export interface QuickAccessLabel {
  title: string;
  description: string;
}

/** Traduz título/descrição de cada card por `id` — só pode ser chamado
 * dentro de um componente (usa `useTranslations`). A lista de QUAIS cards
 * existem/são permitidos continua vindo só de `QUICK_ACCESS_CARDS`/
 * `resolveQuickAccess`; isto aqui é só a camada de apresentação. */
export function useQuickAccessLabels(): Record<string, QuickAccessLabel> {
  const t = useTranslations("workspace.quickAccessCards");
  // `id` é dinâmico (vem do registro acima) — next-intl tipa `t()` com um
  // literal union inferido das chaves estáticas do namespace, incompatível
  // com uma chave montada em runtime; o catálogo (messages/*.json) é a
  // fonte de verdade de verdade aqui, não o tipo estático.
  const tDynamic = t as unknown as (key: string) => string;
  return Object.fromEntries(
    QUICK_ACCESS_CARDS.map((c) => [
      c.id,
      { title: tDynamic(`${c.id}.title`), description: tDynamic(`${c.id}.description`) },
    ])
  );
}

export const DEFAULT_QUICK_ACCESS_IDS: readonly string[] = QUICK_ACCESS_CARDS.map((c) => c.id);

export function quickAccessHref(organizationId: string, card: QuickAccessCardDef): string {
  return `/organizations/${organizationId}/${card.segment}`;
}

export interface ResolvedQuickAccessEntry {
  card: QuickAccessCardDef;
  enabled: boolean;
}

/** Recalcula, a cada chamada, o universo de cards permitidos (rota existe +
 * RBAC do papel ATUAL) e usa a preferência salva só para ordenar/filtrar
 * dentro desse conjunto — nunca para adicionar um card fora dele. Uma
 * preferência com um id que o papel atual não permite mais (ou um id
 * desconhecido) é silenciosamente descartada, nunca "resgata" o card. */
export function resolveQuickAccess(
  role: MembershipRole | null | undefined,
  preference: QuickAccessPreferenceItem[] | null | undefined
): ResolvedQuickAccessEntry[] {
  const allowed = QUICK_ACCESS_CARDS.filter((c) => !c.minRole || hasMinimumRole(role, c.minRole));

  if (!preference) {
    return allowed.map((card) => ({ card, enabled: true }));
  }

  const allowedById = new Map(allowed.map((card) => [card.id, card]));
  const seen = new Set<string>();
  const ordered: ResolvedQuickAccessEntry[] = [];

  for (const item of preference) {
    const card = allowedById.get(item.id);
    if (!card || seen.has(item.id)) continue;
    seen.add(item.id);
    ordered.push({ card, enabled: item.enabled });
  }

  // Card permitido mas ausente da preferência salva (ex.: adicionado numa
  // versão futura) aparece no fim, habilitado por padrão.
  for (const card of allowed) {
    if (!seen.has(card.id)) ordered.push({ card, enabled: true });
  }

  return ordered;
}

export function visibleQuickAccess(
  role: MembershipRole | null | undefined,
  preference: QuickAccessPreferenceItem[] | null | undefined
): QuickAccessCardDef[] {
  return resolveQuickAccess(role, preference)
    .filter((entry) => entry.enabled)
    .map((entry) => entry.card);
}
