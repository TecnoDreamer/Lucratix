"""app/core/email.py::send_email — envio transacional via Resend.

Nunca deve fazer nenhuma chamada de rede quando RESEND_API_KEY nao esta
configurada (custo zero em dev/CI); quando configurada, monta a request
certa contra a API do Resend e nunca levanta excecao para o chamador.
"""

import json
from dataclasses import dataclass
from unittest.mock import MagicMock, patch

from app.core import email as email_module


@dataclass
class _FakeSettings:
    resend_api_key: str | None
    email_from: str = "Lucratix <onboarding@resend.dev>"


def test_returns_false_without_calling_network_when_not_configured(monkeypatch):
    monkeypatch.setattr(email_module, "get_settings", lambda: _FakeSettings(resend_api_key=None))
    with patch.object(email_module.urllib.request, "urlopen") as mock_urlopen:
        result = email_module.send_email(to="a@example.com", subject="Oi", html="<p>Oi</p>")

    assert result is False
    mock_urlopen.assert_not_called()


def test_sends_correctly_formed_request_when_configured(monkeypatch):
    monkeypatch.setattr(
        email_module, "get_settings", lambda: _FakeSettings(resend_api_key="re_test_123")
    )
    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.__enter__.return_value = mock_response

    with patch.object(email_module.urllib.request, "urlopen", return_value=mock_response) as mock_urlopen:
        result = email_module.send_email(to="destino@example.com", subject="Assunto", html="<p>Corpo</p>")

    assert result is True
    mock_urlopen.assert_called_once()
    request = mock_urlopen.call_args[0][0]
    assert request.full_url == "https://api.resend.com/emails"
    assert request.get_header("Authorization") == "Bearer re_test_123"
    body = json.loads(request.data.decode("utf-8"))
    assert body["to"] == ["destino@example.com"]
    assert body["subject"] == "Assunto"
    assert body["html"] == "<p>Corpo</p>"
    assert body["from"] == "Lucratix <onboarding@resend.dev>"


def test_non_2xx_status_is_treated_as_failure(monkeypatch):
    monkeypatch.setattr(
        email_module, "get_settings", lambda: _FakeSettings(resend_api_key="re_test_123")
    )
    mock_response = MagicMock()
    mock_response.status = 422
    mock_response.__enter__.return_value = mock_response

    with patch.object(email_module.urllib.request, "urlopen", return_value=mock_response):
        result = email_module.send_email(to="destino@example.com", subject="Assunto", html="<p>Corpo</p>")

    assert result is False


def test_network_error_never_raises_and_returns_false(monkeypatch):
    monkeypatch.setattr(
        email_module, "get_settings", lambda: _FakeSettings(resend_api_key="re_test_123")
    )
    with patch.object(
        email_module.urllib.request, "urlopen", side_effect=email_module.urllib.error.URLError("boom")
    ):
        result = email_module.send_email(to="destino@example.com", subject="Assunto", html="<p>Corpo</p>")

    assert result is False
