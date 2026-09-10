"""RNF-005: rate limiting em endpoints de autenticacao — defesa contra
forca bruta/credential stuffing/password spraying (ver
docs/security/RATE_LIMITING.md para a arquitetura completa e a
justificativa de cada limite).

Implementacao em memoria (janela deslizante), suficiente para uma unica
instancia de API (confirmado com o usuario: producao no Railway roda hoje
uma unica instancia). Limitacao conhecida, documentada: nao e compartilhada
entre processos/instancias — precisaria de um store externo (ex.: Redis) se
o deploy passar a ter mais de uma replica atras de um load balancer. A
interface abaixo (`RateLimiter` + chaves nomeadas por dimensao) fica pronta
pra essa troca sem precisar redesenhar nenhum ponto de chamada.

Estrategia de chave — o achado central da auditoria de hardening (2026-09):
usar SO uma chave combinada (`IP:conta`) nao bloqueia nem password spraying
(1-2 senhas contra muitas contas, do mesmo IP — cada combinacao IP:conta e
nova) nem credential stuffing distribuido (uma conta atacada de muitos IPs —
mesma razao, ao contrario). Por isso todo endpoint sensivel agora verifica
MULTIPLAS dimensoes independentes (`enforce_rate_limits` abaixo): quando
aplicavel, uma por IP isolado, uma por conta isolada, e a combinada
IP+conta (mais apertada, para o caso comum de usuario legitimo errando a
propria senha). Qualquer uma que estourar bloqueia a requisicao.
"""

import threading
import time
from collections import defaultdict, deque
from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import record_audit


class RateLimiter:
    """Janela deslizante em memoria, thread-safe (`threading.Lock`) — o
    servidor ASGI pode servir handlers sincronos em threads de um pool
    mesmo numa unica instancia/processo; sem lock, duas requisicoes
    concorrentes na mesma chave podiam corromper o deque ou contar tentativas
    erradas (corrida de dados real, nao so uma questao de "distribuicao")."""

    def __init__(self, max_attempts: int, window_seconds: float) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, attempts: deque[float], now: float) -> None:
        while attempts and now - attempts[0] > self.window_seconds:
            attempts.popleft()

    def check(self, key: str) -> bool:
        """Registra uma tentativa para `key`. Retorna False se o limite
        de `max_attempts` dentro da janela de `window_seconds` foi excedido.
        """
        now = time.monotonic()
        with self._lock:
            attempts = self._attempts[key]
            self._prune(attempts, now)
            if len(attempts) >= self.max_attempts:
                return False
            attempts.append(now)
            return True

    def retry_after(self, key: str) -> float:
        """Segundos ate a tentativa mais antiga da janela expirar — usado
        pelo header `Retry-After` do 429. 0 se a chave nao tem tentativas
        registradas (nao deveria ser chamado nesse caso, mas nunca retorna
        negativo)."""
        now = time.monotonic()
        with self._lock:
            attempts = self._attempts[key]
            self._prune(attempts, now)
            if not attempts:
                return 0.0
            return max(0.0, self.window_seconds - (now - attempts[0]))

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)

    def clear_all(self) -> None:
        """Zera TODAS as chaves, nao so uma — uso exclusivo de isolamento de
        teste (ver tests/conftest.py, fixture `_reset_rate_limiters`). Sem
        isso, os limiters por IP isolado (chave = so o IP) acumulam
        tentativas de TODOS os testes da sessao inteira: o `TestClient` do
        Starlette sempre usa o host fixo "testclient", entao a mesma chave
        seria compartilhada por centenas de testes diferentes."""
        with self._lock:
            self._attempts.clear()


def enforce_rate_limits(
    checks: Sequence[tuple[RateLimiter, str]],
    *,
    detail: str,
    db: Session,
    action: str,
) -> None:
    """Roda cada `(limiter, key)` em ordem; na primeira que estourar,
    audita (`action`, entity="rate_limit", sem `user_id`/PII — o bloqueio
    em si e o evento, nao quem foi bloqueado) e levanta 429 com
    `Retry-After` (segundos ate ESSA janela liberar — o valor real do
    limiter que de fato bloqueou, nao uma soma de todas as janelas).
    Mensagem sempre generica (nunca "voce usou N de M tentativas" — isso
    ajudaria quem esta atacando a calibrar)."""
    for limiter, key in checks:
        if not limiter.check(key):
            retry_after = int(limiter.retry_after(key)) + 1
            record_audit(db, action=action, entity="rate_limit")
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=detail,
                headers={"Retry-After": str(retry_after)},
            )


# ---------------------------------------------------------------------------
# /auth/login — combinado (existente, limite mais apertado, cobre o caso
# comum de usuario legitimo errando a propria senha), + IP isolado (spray:
# poucas senhas contra muitas contas do mesmo IP) + conta isolada (stuffing
# distribuido: uma conta atacada de muitos IPs).
# ---------------------------------------------------------------------------
login_rate_limiter = RateLimiter(max_attempts=10, window_seconds=60)
# 30/60s: um IP compartilhado legitimo (escritorio, NAT, rede universitaria)
# pode gerar varias tentativas simultaneas de contas diferentes; 30 numa
# janela de 1 minuto ainda e alto o bastante pra nao incomodar esse caso,
# mas baixo o bastante pra travar um spray de escala (dezenas/centenas de
# contas testadas com 1-2 senhas comuns).
login_ip_rate_limiter = RateLimiter(max_attempts=30, window_seconds=60)
# 10/300s: mais generoso no tempo que o combinado (usuario real pode tentar
# de 2-3 dispositivos ao longo de alguns minutos), mas agrega TODOS os IPs
# contra a mesma conta — e o que trava stuffing distribuido, que o limiter
# combinado (chave por IP+conta) nunca capturaria sozinho.
login_account_rate_limiter = RateLimiter(max_attempts=10, window_seconds=300)

# ---------------------------------------------------------------------------
# /auth/password-reset/request — mesma logica de 3 dimensoes. O endpoint
# dispara e-mail de verdade (app/core/email.py); sem as 3 dimensoes, um
# atacante podia spammar a caixa de entrada de muitas contas de um so IP,
# ou floodar uma unica conta a partir de varios IPs.
# ---------------------------------------------------------------------------
password_reset_rate_limiter = RateLimiter(max_attempts=5, window_seconds=300)
password_reset_ip_rate_limiter = RateLimiter(max_attempts=15, window_seconds=300)
password_reset_account_rate_limiter = RateLimiter(max_attempts=5, window_seconds=900)

# ---------------------------------------------------------------------------
# /auth/resend-verification — mesmo raciocinio de password-reset/request
# (tambem dispara e-mail de verdade).
# ---------------------------------------------------------------------------
email_verification_rate_limiter = RateLimiter(max_attempts=5, window_seconds=300)
email_verification_ip_rate_limiter = RateLimiter(max_attempts=15, window_seconds=300)
email_verification_account_rate_limiter = RateLimiter(max_attempts=5, window_seconds=900)

# ---------------------------------------------------------------------------
# Endpoints que nao tinham NENHUM rate limit ate esta rodada (auditoria de
# hardening, 2026-09) — cada um so por IP quando nao ha "conta" aplicavel
# ainda (registro), ou quando o token/sessao ja e a defesa principal e isto
# e so defesa em profundidade (confirmacao de reset/verificacao).
# ---------------------------------------------------------------------------
# /auth/register: sem conta pra isolar antes de criar uma — so IP. Um IP
# compartilhado pode legitimamente gerar rajadas bem maiores do que se
# imaginaria (escritorio/evento de onboarding cadastrando varias pessoas
# de uma vez; a propria suite e2e deste projeto, rodando contra a mesma
# API, faz dezenas de cadastros em minutos — foi exatamente esse caso que
# corrigiu o valor inicial de 10, baixo demais mesmo pra uso legitimo).
# 100/300s ainda corta um script automatizado em ordens de grandeza (um
# atacante sem limite tentaria muito mais que isso por segundo), sem
# bloquear nenhum uso real observado.
register_ip_rate_limiter = RateLimiter(max_attempts=100, window_seconds=300)
# /auth/password-reset/confirm: o token opaco (256 bits) ja torna forca
# bruta offline inviavel — isto e so defesa em profundidade contra um
# script tentando tokens/chamando o endpoint em volume.
password_reset_confirm_ip_rate_limiter = RateLimiter(max_attempts=20, window_seconds=300)
# /auth/verify-email: mesmo raciocinio de password-reset/confirm.
verify_email_ip_rate_limiter = RateLimiter(max_attempts=20, window_seconds=300)
# /auth/change-password: usuario ja autenticado (sessao unica, RN-016) — o
# risco aqui e uma sessao comprometida testando a senha atual em loop; conta
# isolada (nao IP, o atacante ja tem uma sessao valida de algum lugar).
change_password_account_rate_limiter = RateLimiter(max_attempts=10, window_seconds=300)
# /auth/refresh: chamado automaticamente por clientes legitimos com alguma
# frequencia; risco menor (exige refresh_token valido + sessao nao revogada),
# mas ainda assim sem nenhum limite antes desta rodada — generoso de proposito.
refresh_ip_rate_limiter = RateLimiter(max_attempts=60, window_seconds=60)

# ---------------------------------------------------------------------------
# Convite de membership e criacao administrativa de usuario — ja exigem
# sessao autenticada + papel elevado (ORGANIZATION_ADMIN+ ou Super Admin),
# mas nao tinham nenhum limite contra abuso de convite/criacao em massa
# (ex.: uma sessao de admin comprometida criando dezenas de contas).
# ---------------------------------------------------------------------------
membership_invite_rate_limiter = RateLimiter(max_attempts=20, window_seconds=300)
platform_user_create_rate_limiter = RateLimiter(max_attempts=20, window_seconds=300)

# Mesmo raciocinio: criar chave de API ja exige ORGANIZATION_ADMIN+, mas sem
# limite contra geracao em massa (ex.: sessao de admin comprometida criando
# dezenas de chaves pra exfiltrar dado depois de perder acesso).
api_key_create_rate_limiter = RateLimiter(max_attempts=20, window_seconds=300)

# Protecao barata contra estourar a cota gratuita do Cloudinary (25
# creditos/mes) por engano/abuso — 10 tentativas em 5 minutos e mais que
# suficiente pra um fluxo normal de "tentei, nao gostei, troquei de novo".
logo_upload_rate_limiter = RateLimiter(max_attempts=10, window_seconds=300)
