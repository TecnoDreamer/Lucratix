"""RF-025, RN-013 — analise de resultado de experimento.

Regra de negocio central (RN-013): o sistema NUNCA declara uma variante
"vencedora" apenas porque a conversao bruta e numericamente maior. Este
modulo aplica um criterio minimo de tamanho de amostra antes de sequer
apontar uma variante como "em vantagem" e, a partir dele (2026-08-31),
um teste de significancia estatistica formal de verdade — teste-z de
duas proporcoes, `statistics.NormalDist` da biblioteca padrao do Python
(mesmo espirito de `engine.py::correlation`, que usa `statistics.correlation`:
nenhuma dependencia nova como scipy). RN-013 previa isso desde o inicio
("... e, quando implementado, significancia estatistica ...", ver
docs/requirements/business-rules.md) — antes desta rodada, "quando
implementado" nunca tinha acontecido.

Escopo deliberado (documentado, nao omitido): cada variante e comparada
contra a PRIMEIRA da lista (a "Controle", por convencao do frontend,
`apps/web/.../experiments/page.tsx`) — nunca todas contra todas. Com
exatamente 2 variantes (o unico caso que a UI produz hoje) isso e o teste
completo; com 3+ (o schema permite `min_length=2`, sem teto), isso e N-1
comparacoes par-a-par sem correcao para comparacoes multiplas (ex.:
Bonferroni) — um omnibus (qui-quadrado) ficaria mais completo, mas exigiria
a funcao gama incompleta regularizada, que a biblioteca padrao nao tem sem
reimplementar por conta propria; por ora fica fora, documentado aqui, nao
inventado.

Modulo puro (sem SQLAlchemy/FastAPI), testavel em isolamento (RNF-016).
"""

import math
from dataclasses import dataclass
from statistics import NormalDist

from app.modules.metrics import engine
from app.modules.metrics.engine import MetricResult

MIN_SAMPLE_SIZE = 30
# Limiar convencional de 95% de confianca (bicaudal) — o mesmo padrao de
# mercado usado por praticamente toda ferramenta de A/B testing. Exposto
# como constante (e devolvido na resposta, `ExperimentSummary.significance_alpha`)
# para nunca ficar implicito: quem le o resultado sabe exatamente contra
# que limiar "significativo" foi decidido.
SIGNIFICANCE_ALPHA = 0.05

_NORMAL = NormalDist()


def two_proportion_z_test(
    count_a: int | None, n_a: int | None, count_b: int | None, n_b: int | None
) -> tuple[float | None, float | None]:
    """Teste-z de duas proporcoes (bicaudal), proporcao combinada (pooled).
    Devolve `(z, p_value)` — `(None, None)` quando nao aplicavel: amostra
    ausente/zero, ou variancia combinada zero (as duas taxas identicas nos
    extremos, ex.: 0% e 0%, ou 100% e 100% — z matematicamente indefinido,
    NUNCA tratado como "sem diferenca" / p_value=1.0 por adivinhacao).
    """
    if count_a is None or n_a is None or count_b is None or n_b is None:
        return None, None
    if n_a <= 0 or n_b <= 0:
        return None, None

    p_a = count_a / n_a
    p_b = count_b / n_b
    pooled = (count_a + count_b) / (n_a + n_b)
    variance = pooled * (1 - pooled) * (1 / n_a + 1 / n_b)
    if variance <= 0:
        return None, None

    z = (p_a - p_b) / math.sqrt(variance)
    p_value = 2 * (1 - _NORMAL.cdf(abs(z)))
    return z, p_value


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
    # Comparação contra a variante "controle" (a primeira da lista) — a
    # própria controle carrega None nos dois (nada para comparar contra si
    # mesma). Só preenchido quando `has_sufficient_sample` é True.
    p_value: float | None = None
    is_significant: bool | None = None


@dataclass(frozen=True)
class ExperimentSummary:
    variants: list[VariantSummary]
    has_sufficient_sample: bool
    leading_variant_name: str | None
    note: str
    significance_alpha: float = SIGNIFICANCE_ALPHA


def summarize_experiment(variants: list[VariantInput]) -> ExperimentSummary:
    has_sufficient_sample = len(variants) >= 2 and all(
        v.sample_size is not None and v.sample_size >= MIN_SAMPLE_SIZE for v in variants
    )

    baseline = variants[0] if variants else None
    summaries: list[VariantSummary] = []
    for i, v in enumerate(variants):
        p_value: float | None = None
        is_significant: bool | None = None
        if has_sufficient_sample and i > 0 and baseline is not None:
            _, p_value = two_proportion_z_test(
                baseline.conversions, baseline.sample_size, v.conversions, v.sample_size
            )
            if p_value is not None:
                is_significant = p_value < SIGNIFICANCE_ALPHA
        summaries.append(
            VariantSummary(
                name=v.name,
                sample_size=v.sample_size,
                conversions=v.conversions,
                conversion_rate=engine.conversion_rate(v.conversions, v.sample_size),
                p_value=p_value,
                is_significant=is_significant,
            )
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
            f"Cada variante foi comparada contra a Controle por teste-z de duas proporcoes "
            f"(nivel de confianca {(1 - SIGNIFICANCE_ALPHA) * 100:.0f}%). \"Significativo\" aqui "
            "significa so isso — nao prova causalidade, nao corrige para multiplas comparacoes "
            "quando ha mais de uma variante de teste, e olhar o resultado repetidamente antes do "
            "fim planejado do experimento (\"peeking\") infla a chance de um falso positivo."
        )

    return ExperimentSummary(
        variants=summaries,
        has_sufficient_sample=has_sufficient_sample,
        leading_variant_name=leading_variant_name,
        note=note,
    )
