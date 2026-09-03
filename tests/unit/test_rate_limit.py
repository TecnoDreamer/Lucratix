"""RNF-005 — rate limiting em memoria."""

import time
from concurrent.futures import ThreadPoolExecutor

from app.core.rate_limit import RateLimiter


def test_allows_up_to_max_attempts():
    limiter = RateLimiter(max_attempts=3, window_seconds=60)
    assert limiter.check("k") is True
    assert limiter.check("k") is True
    assert limiter.check("k") is True


def test_blocks_after_max_attempts_within_window():
    limiter = RateLimiter(max_attempts=2, window_seconds=60)
    assert limiter.check("k") is True
    assert limiter.check("k") is True
    assert limiter.check("k") is False


def test_keys_are_independent():
    limiter = RateLimiter(max_attempts=1, window_seconds=60)
    assert limiter.check("a") is True
    assert limiter.check("b") is True
    assert limiter.check("a") is False


def test_allows_again_after_window_expires():
    limiter = RateLimiter(max_attempts=1, window_seconds=0.1)
    assert limiter.check("k") is True
    assert limiter.check("k") is False
    time.sleep(0.3)
    assert limiter.check("k") is True


def test_reset_clears_key():
    limiter = RateLimiter(max_attempts=1, window_seconds=60)
    assert limiter.check("k") is True
    assert limiter.check("k") is False
    limiter.reset("k")
    assert limiter.check("k") is True


def test_clear_all_resets_every_key():
    limiter = RateLimiter(max_attempts=1, window_seconds=60)
    limiter.check("a")
    limiter.check("b")
    limiter.clear_all()
    assert limiter.check("a") is True
    assert limiter.check("b") is True


def test_concurrent_checks_on_same_key_never_allow_more_than_max_attempts():
    # Corrida de dados real (uvicorn pode servir handlers sincronos numa
    # thread pool mesmo numa unica instancia/processo, ver rate_limit.py) —
    # sem o lock, threads concorrentes podiam ler o mesmo estado do deque
    # antes de qualquer uma escrever, deixando mais de `max_attempts`
    # passarem juntas.
    limiter = RateLimiter(max_attempts=20, window_seconds=60)
    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(lambda _: limiter.check("k"), range(100)))
    assert results.count(True) == 20
    assert results.count(False) == 80


def test_retry_after_is_positive_while_blocked_and_zero_for_unknown_key():
    limiter = RateLimiter(max_attempts=1, window_seconds=60)
    limiter.check("k")
    assert 0 < limiter.retry_after("k") <= 60
    assert limiter.retry_after("nunca-usada") == 0
