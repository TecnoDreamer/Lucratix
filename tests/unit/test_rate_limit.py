"""RNF-005 — rate limiting em memoria."""

import time

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
