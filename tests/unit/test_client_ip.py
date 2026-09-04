"""app/core/client_ip.py — resolucao de IP confiavel (defesa contra
forca bruta: um IP forjado via header nao pode contornar o rate limiting).
"""

from dataclasses import dataclass
from unittest.mock import MagicMock

from app.core import client_ip as client_ip_module
from app.core.client_ip import get_client_ip


@dataclass
class _FakeSettings:
    trusted_proxy_count: int = 0


def _fake_request(*, client_host: str | None, forwarded_for: str | None = None) -> MagicMock:
    request = MagicMock()
    request.client.host = client_host
    request.headers = {"x-forwarded-for": forwarded_for} if forwarded_for is not None else {}
    return request


def test_uses_socket_ip_by_default_ignoring_forwarded_header(monkeypatch):
    # trusted_proxy_count=0 (padrao) — X-Forwarded-For nunca e confiavel
    # sozinho, e um header que o proprio cliente controla.
    monkeypatch.setattr(client_ip_module, "get_settings", lambda: _FakeSettings(trusted_proxy_count=0))
    request = _fake_request(client_host="203.0.113.10", forwarded_for="1.2.3.4")
    assert get_client_ip(request) == "203.0.113.10"


def test_falls_back_to_unknown_without_client(monkeypatch):
    monkeypatch.setattr(client_ip_module, "get_settings", lambda: _FakeSettings(trusted_proxy_count=0))
    request = MagicMock()
    request.client = None
    request.headers = {}
    assert get_client_ip(request) == "unknown"


def test_forged_forwarded_for_is_ignored_when_no_trusted_proxy_configured(monkeypatch):
    # O caso que este modulo existe pra prevenir: um atacante mandando
    # X-Forwarded-For diferente a cada tentativa pra tentar contornar o
    # rate limiting por IP.
    monkeypatch.setattr(client_ip_module, "get_settings", lambda: _FakeSettings(trusted_proxy_count=0))
    request = _fake_request(client_host="203.0.113.10", forwarded_for="1.1.1.1, 2.2.2.2, 3.3.3.3")
    assert get_client_ip(request) == "203.0.113.10"


def test_trusted_proxy_count_one_takes_the_last_hop(monkeypatch):
    # "cliente, proxy1" — com 1 proxy confiavel configurado, o IP real e o
    # ULTIMO da lista (o hop mais proximo da API, adicionado pelo proprio
    # proxy) — nunca o primeiro (que veio do cliente e pode ser forjado).
    monkeypatch.setattr(client_ip_module, "get_settings", lambda: _FakeSettings(trusted_proxy_count=1))
    request = _fake_request(client_host="10.0.0.1", forwarded_for="198.51.100.7, 10.0.0.5")
    assert get_client_ip(request) == "10.0.0.5"


def test_trusted_proxy_count_two_takes_the_second_to_last_hop(monkeypatch):
    monkeypatch.setattr(client_ip_module, "get_settings", lambda: _FakeSettings(trusted_proxy_count=2))
    request = _fake_request(client_host="10.0.0.1", forwarded_for="198.51.100.7, 10.0.0.5, 10.0.0.6")
    assert get_client_ip(request) == "10.0.0.5"


def test_trusted_proxy_configured_but_header_missing_falls_back_to_socket_ip(monkeypatch):
    monkeypatch.setattr(client_ip_module, "get_settings", lambda: _FakeSettings(trusted_proxy_count=1))
    request = _fake_request(client_host="203.0.113.10", forwarded_for=None)
    assert get_client_ip(request) == "203.0.113.10"


def test_trusted_proxy_configured_but_header_has_fewer_hops_than_expected_falls_back(monkeypatch):
    # Header com menos hops do que o configurado nunca deveria acontecer em
    # producao, mas o comportamento seguro e cair pro IP do socket em vez de
    # indexar fora da lista (ou pegar um hop que nao veio de um proxy confiavel).
    monkeypatch.setattr(client_ip_module, "get_settings", lambda: _FakeSettings(trusted_proxy_count=3))
    request = _fake_request(client_host="203.0.113.10", forwarded_for="1.1.1.1, 2.2.2.2")
    assert get_client_ip(request) == "203.0.113.10"


def test_ipv6_socket_address_is_used_as_is(monkeypatch):
    # Teste de bypass (secao 24): o IP e tratado como string opaca — um
    # cliente em IPv6 nao escapa do rate limiting nem quebra a resolucao.
    # `sessions.ip_address` ja e String(45) especificamente pra caber o
    # maior literal IPv6 possivel (migration 0017_session_metadata).
    monkeypatch.setattr(client_ip_module, "get_settings", lambda: _FakeSettings(trusted_proxy_count=0))
    request = _fake_request(client_host="2001:0db8:85a3:0000:0000:8a2e:0370:7334", forwarded_for="1.2.3.4")
    assert get_client_ip(request) == "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
