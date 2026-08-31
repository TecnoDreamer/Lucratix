"""Envio de e-mail transacional via Resend (RF-001 — confirmação de conta;
reaproveitado por reset de senha e criação de conta por admin/Super Admin,
os tres fluxos que ate agora so tinham o fallback `dev_token`).

`urllib.request` da biblioteca padrao — a API do Resend e um unico POST
JSON com um header Bearer, nao justifica adicionar o SDK deles nem `httpx`
como dependencia de producao (mesmo espirito de reaproveitar
`statistics.NormalDist`/`statistics.correlation` em vez de trazer scipy).
"""

import json
import urllib.error
import urllib.request

from app.core.config import get_settings

_RESEND_URL = "https://api.resend.com/emails"
_TIMEOUT_SECONDS = 10


def send_email(*, to: str, subject: str, html: str) -> bool:
    """Best-effort: nunca levanta excecao para o chamador. Devolve False sem
    tentar nenhuma chamada de rede quando `RESEND_API_KEY` nao esta
    configurada (dev/CI continuam exatamente como hoje, sem custo nenhum) —
    quem chama decide o fallback (`dev_token` na resposta, fora de producao).
    """
    settings = get_settings()
    if not settings.resend_api_key:
        return False

    payload = json.dumps(
        {"from": settings.email_from, "to": [to], "subject": subject, "html": html}
    ).encode("utf-8")
    request = urllib.request.Request(
        _RESEND_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        # S310/B310: URL e a constante _RESEND_URL acima, nunca dado de
        # entrada — nao existe risco de esquema arbitrario (file://, etc.)
        # aqui. noqa (ruff) e nosec (bandit, CI roda os dois separadamente)
        # pelo mesmo motivo.
        with urllib.request.urlopen(request, timeout=_TIMEOUT_SECONDS) as response:  # noqa: S310 # nosec B310
            status_code = int(response.status)
            return 200 <= status_code < 300
    except (urllib.error.URLError, TimeoutError) as exc:
        # Falha de rede/provedor nunca derruba o fluxo que chamou (conta
        # continua criada, senha continua redefinivel via dev_token/log) --
        # so registra, nao inventa sucesso nem propaga excecao.
        print(f"[email] falha ao enviar para {to!r}: {exc}")
        return False
