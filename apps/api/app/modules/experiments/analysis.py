"""RF-025, RN-013 — analise de resultado de experimento.

Regra de negocio central (RN-013): o sistema NUNCA declara uma variante
"vencedora" apenas porque a conversao bruta e numericamente maior. Este
modulo aplica um criterio minimo de tamanho de amostra antes de sequer
apontar uma variante como "em vantagem" — e mesmo assim, deixa explicito
que isso NAO e um teste de significancia estatistica formal (esse fica
fora do escopo do MVP, ver docs/product/out-of-scope.md).

Modulo puro (sem SQLAlchemy/FastAPI), testavel em isolamento (RNF-016).
"""

from dataclasses import dataclass

from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult

MIN_SAMPLE_SIZE = 30


@dataclass(frozen=True)
class VariantInput:
    name: str
    sample_size: int | None
    conversions: int | None


@dataclass(frozen=True)
class VariantSummary:
    name: str
    sample_size: int | None
    conversions: int | None
    conversion_rate: MetricResult


@dataclass(frozen=True)
class ExperimentSummary:
    variants: list[VariantSummary]
    has_sufficient_sample: bool
    leading_variant_name: str | None
    note: str


def summarize_experiment(variants: list[VariantInput]) -> ExperimentSummary:
    summaries = [
        VariantSummary(
            name=v.name,
            sample_size=v.sample_size,
            conversions=v.conversions,
            conversion_rate=engine.conversion_rate(v.conversions, v.sample_size),
        )
        for v in variants
    ]

    has_sufficient_sample = len(summaries) >= 2 and all(
        s.sample_size is not None and s.sample_size >= MIN_SAMPLE_SIZE for s in summaries
    )

    leading_variant_name: str | None = None
    if has_sufficient_sample:
        rates: list[tuple[str, float]] = [
            (s.name, s.conversion_rate.value)
            for s in summaries
            if s.conversion_rate.is_applicable and s.conversion_rate.value is not None
        ]
        if len(rates) == len(summaries):
            leading_variant_name = max(rates, key=lambda item: item[1])[0]

    if not has_sufficient_sample:
        note = (
            f"Amostra minima de {MIN_SAMPLE_SIZE} nao atingida em todas as variantes — "
            "resultado nao deve ser usado para decisao (RN-013)."
        )
    else:
        note = (
            "Amostra minima atingida, mas isto NAO e um teste de significancia estatistica "
            "formal. Use como indicativo, nao como prova de causalidade."
        )

    return ExperimentSummary(
        variants=summaries,
        has_sufficient_sample=has_sufficient_sample,
        leading_variant_name=leading_variant_name,
        note=note,
    )
