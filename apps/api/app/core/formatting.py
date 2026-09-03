"""Formatacao numerica pt-BR para texto gerado no backend (relatorio em
PDF, 2026-09-02 — nenhuma outra parte do backend formatava numero pra
exibicao antes disso; sempre foi responsabilidade do frontend, ver
apps/web/src/lib/formatters.ts). Sem `locale.setlocale` (estado global de
processo, nao seguro num servidor multi-thread/async, e exigiria o
locale pt_BR instalado no SO) nem uma dependencia nova so pra isso
(babel) — troca de separador, mesmo resultado, zero custo extra.
"""


def format_integer(value: float) -> str:
    """1234567 -> "1.234.567" (separador de milhar pt-BR, sem casas
    decimais — mesma convencao de `formatInteger` em lib/formatters.ts)."""
    return f"{round(value):,}".replace(",", ".")


def format_percentage(value: float, *, signed: bool = False) -> str:
    """0.267 -> "26,7%" (multiplica por 100, 1 casa decimal, virgula —
    mesma convencao de `formatPercentage` em lib/formatters.ts). `signed`
    antepoe "+" quando positivo (nunca em zero/negativo, que ja tem sinal
    proprio)."""
    pct = value * 100
    sign = "+" if signed and pct > 0 else ""
    # US: ponto decimal, virgula de milhar. Troca via placeholder pra pt-BR
    # (ponto de milhar, virgula decimal) sem os dois caracteres colidirem.
    formatted = f"{pct:,.1f}".replace(",", "\x00").replace(".", ",").replace("\x00", ".")
    return f"{sign}{formatted}%"
