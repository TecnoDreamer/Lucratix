"""Calculo de periodo anterior equivalente — RF-023/secao 6 do prompt de BI
("KPIs relevantes devem permitir comparacao com periodo anterior
equivalente"). Puro (sem banco/framework), para ser testavel sem
infraestrutura, no mesmo espirito de app/modules/metrics/engine.py.
"""

from datetime import date, timedelta


def previous_equivalent_range(date_from: date, date_to: date) -> tuple[date, date]:
    """Dado um intervalo [date_from, date_to], retorna o intervalo
    imediatamente anterior de mesma duracao em dias.

    Exemplo: 2026-08-01..2026-08-31 (31 dias) -> 2026-07-01..2026-07-31.
    Nao tenta alinhar a meses de calendario quando o intervalo nao e um mes
    inteiro — e literalmente "os N dias anteriores a este intervalo".
    """
    length_days = (date_to - date_from).days + 1
    previous_to = date_from - timedelta(days=1)
    previous_from = previous_to - timedelta(days=length_days - 1)
    return previous_from, previous_to


def months_in_range(date_from: date, date_to: date) -> int:
    """Quantos meses de calendario o intervalo toca (ex.: 15/08 a 03/09 toca
    2 — agosto e setembro), usado para expressar completude de dados:
    `FinancialPeriod`/`FunnelSnapshot` sao mensais, entao esse e o numero
    maximo de registros possiveis no intervalo."""
    return (date_to.year - date_from.year) * 12 + (date_to.month - date_from.month) + 1


def months_between(date_from: date, date_to: date) -> list[date]:
    """Lista o dia 1 de cada mes de calendario tocado pelo intervalo, em
    ordem cronologica (ex.: 15/08 a 03/09 -> [2026-08-01, 2026-09-01]).
    Usado para montar series mensais (um ponto por mes) — `FinancialPeriod`/
    `FunnelSnapshot` guardam `period` sempre como dia 1, entao essa lista e
    exatamente o conjunto de chaves a procurar."""
    months = []
    current = date_from.replace(day=1)
    end = date_to.replace(day=1)
    while current <= end:
        months.append(current)
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    return months
