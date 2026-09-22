import { useTranslations } from "next-intl";

// Os dois formatos que `app/modules/metrics/engine.py::MetricResult` produz
// pra toda metrica calculada (RN-003/RN-004) — ver `MetricResult.missing_data`
// e `MetricResult.division_by_zero`. Nome de campo interno (ex.: "revenue",
// "marketing_investment") nunca deve vazar pra tela sem tradução (achado 4.2
// da auditoria: "dado ausente: revenue" aparecia cru).
const MISSING_DATA_RE = /^dado ausente: (.+)$/;
const DIVISION_BY_ZERO_RE = /^divisao por zero: (.+)$/;

/**
 * Traduz o `reason` de um `MetricResult` pra texto legível nos 3 idiomas.
 * Só reconhece os dois formatos acima (nome de campo cru); qualquer outro
 * texto (ex.: `correlation_service.py`/`targets_service.py`, que já
 * devolvem frases prontas em pt-BR) passa direto — esses ainda não são
 * i18n'd no backend, débito registrado em vez de meia-tradução.
 */
export function useMetricReasonLabel(): (reason: string | null) => string | null {
  const t = useTranslations("common");
  const tFields = useTranslations("metricFields");
  const tFieldsDynamic = tFields as unknown as (key: string) => string;
  const fieldLabel = (field: string) => {
    try {
      return tFieldsDynamic(field);
    } catch {
      return field;
    }
  };
  return (reason) => {
    if (!reason) return reason;
    const missing = reason.match(MISSING_DATA_RE);
    if (missing) return t("missingData", { field: fieldLabel(missing[1]) });
    const divisionByZero = reason.match(DIVISION_BY_ZERO_RE);
    if (divisionByZero) return t("divisionByZero", { field: fieldLabel(divisionByZero[1]) });
    return reason;
  };
}
