"""Resolucao do IP do cliente para rate limiting (defesa contra forca
bruta/spray/stuffing, ver docs/security/RATE_LIMITING.md). `request.client.host`
e a unica fonte confiavel por padrao — nunca aceitar `X-Forwarded-For` as
cegas, ja que e um header enviado pelo proprio cliente e pode ser forjado
por quem esta atacando (o cenario que este modulo existe para proteger).

So passa a olhar `X-Forwarded-For` quando `settings.trusted_proxy_count > 0`
for configurado explicitamente (nenhum proxy confiavel conhecido roda na
frente da API hoje — Railway serve o processo diretamente, sem Nginx/
Cloudflare proprios deste projeto na frente, ver auditoria em
docs/security/RATE_LIMITING.md). Se um proxy confiavel for adicionado no
futuro, configurar essa variavel de ambiente e o suficiente — nenhum ponto
de chamada (rate limiting, auditoria) precisa mudar.
"""

from fastapi import Request

from app.core.config import get_settings

_UNKNOWN = "unknown"


def get_client_ip(request: Request) -> str:
    """IP do cliente para usar como parte de uma chave de rate limiting/
    auditoria. Com `trusted_proxy_count=0` (padrao), e sempre
    `request.client.host` — o mesmo comportamento que ja existia antes
    deste modulo, so centralizado num unico lugar em vez de duplicado em
    4 endpoints.

    Com `trusted_proxy_count=N > 0`: `X-Forwarded-For` e uma lista
    "cliente, proxy1, proxy2, ...", da esquerda pra direita — cada proxy
    confiavel ADICIONA um IP no fim da lista, nunca no comeco (que so o
    cliente controla). Pegar o N-esimo IP a partir da DIREITA da lista e
    o IP inserido pelo proxy mais proximo da API — o unico dado que os N
    proxies confiaveis realmente testemunharam, nunca um valor que o
    cliente poderia ter forjado sozinho.
    """
    settings = get_settings()
    if settings.trusted_proxy_count > 0:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            hops = [hop.strip() for hop in forwarded_for.split(",") if hop.strip()]
            if len(hops) >= settings.trusted_proxy_count:
                return hops[-settings.trusted_proxy_count]

    return request.client.host if request.client else _UNKNOWN
