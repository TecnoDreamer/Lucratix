"""RNF-005: rate limiting em endpoints de autenticacao.

Implementacao em memoria (janela fixa), suficiente para uma unica
instancia de API no MVP. Limitacao conhecida: nao e compartilhada entre
processos/instancias (precisaria de um store externo, ex.: Redis, se o
deploy passar a ter mais de um worker/instancia atras de um load
balancer) — documentar como item de hardening (Fase 18) se isso mudar.
"""

import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_attempts: int, window_seconds: float) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> bool:
        """Registra uma tentativa para `key`. Retorna False se o limite
        de `max_attempts` dentro da janela de `window_seconds` foi excedido.
        """
        now = time.monotonic()
        attempts = self._attempts[key]
        while attempts and now - attempts[0] > self.window_seconds:
            attempts.popleft()
        if len(attempts) >= self.max_attempts:
            return False
        attempts.append(now)
        return True

    def reset(self, key: str) -> None:
        self._attempts.pop(key, None)


login_rate_limiter = RateLimiter(max_attempts=10, window_seconds=60)
