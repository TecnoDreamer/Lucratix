import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import {
  FUNNEL_STAGE_KEYS,
  type FunnelAnalytics,
  type FunnelSeries,
  type FunnelStages,
  type StageConversionWithComparison,
} from "@/lib/funnel-metrics";
import type { MetricResult } from "@/lib/metrics";
import FunnelPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "org-123" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn(), put: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.put).mockReset();
});

const notApplicable = (): MetricResult => ({ value: null, is_applicable: false, reason: "no_data" });
const applicable = (value: number): MetricResult => ({ value, is_applicable: true, reason: null });

const EMPTY_STAGES: FunnelStages = {
  impressions: notApplicable(),
  visits: notApplicable(),
  leads: notApplicable(),
  mqls: notApplicable(),
  sqls: notApplicable(),
  opportunities: notApplicable(),
  customers: notApplicable(),
  repeat_purchases: notApplicable(),
};

const FILLED_STAGES: FunnelStages = {
  impressions: applicable(100000),
  visits: applicable(20000),
  leads: applicable(4000),
  mqls: applicable(2000),
  sqls: applicable(800),
  opportunities: applicable(400),
  customers: applicable(120),
  repeat_purchases: applicable(30),
};

/** As 7 transições consecutivas (mesmo formato de `analytics.conversions` do
 * backend real) — `StageConversionChart` acessa `conversions[0]` sem checar
 * se o array está vazio, então mesmo o estado "sem dado" precisa de um
 * array não-vazio pra não quebrar o render (o backend real nunca manda um
 * array vazio: sempre as 7 transições, cada uma com `is_applicable`
 * refletindo a etapa). */
function buildConversions(hasData: boolean): StageConversionWithComparison[] {
  return FUNNEL_STAGE_KEYS.slice(0, -1).map((from_stage, i) => ({
    from_stage,
    to_stage: FUNNEL_STAGE_KEYS[i + 1],
    conversion_rate: hasData ? applicable(0.2) : notApplicable(),
    drop_off_rate: hasData ? applicable(0.8) : notApplicable(),
    conversion_rate_comparison: {
      baseline_value: null,
      current_value: hasData ? 0.2 : null,
      absolute_change: null,
      percent_change: null,
    },
  }));
}

/** Mocka os três GETs que `FunnelAnalyticsSection`/`useChartSettings`
 * disparam no mount, além do GET de `/funnel-snapshots` da tabela de
 * lançamento manual — `stages` do `/analytics/funnel` muda conforme o
 * callback `hasData()`, pra simular "antes"/"depois" do PUT sem precisar
 * remontar o componente (é exatamente essa transição sem reload que o bug
 * corrigido nesta PR precisa provar). */
function mockApiGet(hasData: () => boolean) {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.includes("/funnel-snapshots")) return Promise.resolve([]);
    if (path.includes("/chart-preferences/")) {
      return Promise.resolve({
        organization_id: "org-123",
        chart_key: "funnel-stages",
        preferences: null,
        updated_at: null,
      });
    }
    if (path.includes("/analytics/funnel/series")) {
      const result: FunnelSeries = { date_from: "2026-09-01", date_to: "2026-09-30", points: [] };
      return Promise.resolve(result);
    }
    if (path.includes("/analytics/funnel")) {
      const result: FunnelAnalytics = {
        date_from: "2026-09-01",
        date_to: "2026-09-30",
        previous_date_from: "2026-08-01",
        previous_date_to: "2026-08-31",
        stages: hasData() ? FILLED_STAGES : EMPTY_STAGES,
        conversions: buildConversions(hasData()),
      };
      return Promise.resolve(result);
    }
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

describe("FunnelPage — atualização da análise após lançamento manual", () => {
  it("o gráfico do Funil sai de 'sem dados' pra mostrar o período recém-salvo, sem reload", async () => {
    // Regressão encontrada na verificação da PR3 (persistência de gráficos):
    // FunnelAnalyticsSection só reagia a `range`, então um período recém
    // lançado no formulário abaixo ficava invisível nos KPIs/gráficos até
    // um reload manual da página.
    mockApiGet(() => vi.mocked(api.put).mock.calls.length > 0);
    vi.mocked(api.put).mockResolvedValue({
      id: "snap-1",
      organization_id: "org-123",
      period: "2026-09-01",
      channel_id: null,
      impressions: 100000,
      visits: 20000,
      leads: 4000,
      mqls: 2000,
      sqls: 800,
      opportunities: 400,
      customers: 120,
      repeat_purchases: 30,
    });

    render(<FunnelPage />);

    // Nome exato (não regex solto) — "sem dados suficientes" sozinho casaria
    // com os TRÊS gráficos (Funil, Conversão por etapa, Evolução temporal)
    // ao mesmo tempo, e `findByRole` (singular) rejeita múltiplos matches.
    expect(
      await screen.findByRole("img", { name: "Funil: sem dados suficientes no período" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Impressões", { exact: true }), {
      target: { value: "100000" },
    });
    fireEvent.change(screen.getByLabelText("Visitas", { exact: true }), {
      target: { value: "20000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar período" }));

    expect(await screen.findByRole("img", { name: "Funil" })).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Funil: sem dados suficientes no período" })
    ).not.toBeInTheDocument();
  });
});
