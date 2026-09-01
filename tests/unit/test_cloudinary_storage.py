"""app/core/storage.py — upload/remocao de logotipo via Cloudinary.

Mesmo espirito de tests/unit/test_email_service.py: nunca faz chamada de
rede quando nao configurado, monta a request certa quando configurado,
nunca deixa uma excecao de rede vazar sem tratamento definido.
"""

import base64
import json
from dataclasses import dataclass
from unittest.mock import MagicMock, patch

import pytest

from app.core import storage as storage_module
from app.core.storage import StorageError, StorageNotConfiguredError


@dataclass
class _FakeSettings:
    cloudinary_cloud_name: str | None
    cloudinary_api_key: str | None = "key123"
    cloudinary_api_secret: str | None = "secret123"


def test_upload_raises_not_configured_without_calling_network_when_unset(monkeypatch):
    monkeypatch.setattr(
        storage_module, "get_settings", lambda: _FakeSettings(cloudinary_cloud_name=None)
    )
    with patch.object(storage_module.urllib.request, "urlopen") as mock_urlopen:
        with pytest.raises(StorageNotConfiguredError):
            storage_module.upload_organization_logo(
                organization_id="org-1", content=b"x", image_format="png"
            )
    mock_urlopen.assert_not_called()


def test_upload_sends_correctly_signed_request_when_configured(monkeypatch):
    monkeypatch.setattr(
        storage_module, "get_settings", lambda: _FakeSettings(cloudinary_cloud_name="demo")
    )
    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.read.return_value = json.dumps(
        {"secure_url": "https://res.cloudinary.com/demo/image/upload/v1/lucratix/organizations/org-1.png"}
    ).encode("utf-8")
    mock_response.__enter__.return_value = mock_response

    with patch.object(storage_module.urllib.request, "urlopen", return_value=mock_response) as mock_urlopen:
        url = storage_module.upload_organization_logo(
            organization_id="org-1", content=b"fake-bytes", image_format="png"
        )

    assert url == "https://res.cloudinary.com/demo/image/upload/v1/lucratix/organizations/org-1.png"
    mock_urlopen.assert_called_once()
    request = mock_urlopen.call_args[0][0]
    assert request.full_url == "https://api.cloudinary.com/v1_1/demo/image/upload"

    import urllib.parse

    body = urllib.parse.parse_qs(request.data.decode("utf-8"))
    assert body["public_id"] == ["lucratix/organizations/org-1"]
    assert body["api_key"] == ["key123"]
    assert "signature" in body
    # file e' um data URI base64 do conteudo original.
    expected_b64 = base64.b64encode(b"fake-bytes").decode("ascii")
    assert body["file"] == [f"data:image/png;base64,{expected_b64}"]


def test_upload_prefers_eager_transformation_url_when_present(monkeypatch):
    monkeypatch.setattr(
        storage_module, "get_settings", lambda: _FakeSettings(cloudinary_cloud_name="demo")
    )
    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.read.return_value = json.dumps(
        {
            "secure_url": "https://res.cloudinary.com/demo/original.png",
            "eager": [{"secure_url": "https://res.cloudinary.com/demo/resized.png"}],
        }
    ).encode("utf-8")
    mock_response.__enter__.return_value = mock_response

    with patch.object(storage_module.urllib.request, "urlopen", return_value=mock_response):
        url = storage_module.upload_organization_logo(
            organization_id="org-1", content=b"x", image_format="png"
        )

    assert url == "https://res.cloudinary.com/demo/resized.png"


def test_upload_raises_storage_error_on_network_failure(monkeypatch):
    monkeypatch.setattr(
        storage_module, "get_settings", lambda: _FakeSettings(cloudinary_cloud_name="demo")
    )
    with patch.object(
        storage_module.urllib.request, "urlopen", side_effect=storage_module.urllib.error.URLError("boom")
    ):
        with pytest.raises(StorageError):
            storage_module.upload_organization_logo(
                organization_id="org-1", content=b"x", image_format="png"
            )


def test_upload_raises_storage_error_on_non_2xx_status(monkeypatch):
    monkeypatch.setattr(
        storage_module, "get_settings", lambda: _FakeSettings(cloudinary_cloud_name="demo")
    )
    mock_response = MagicMock()
    mock_response.status = 400
    mock_response.read.return_value = b"{}"
    mock_response.__enter__.return_value = mock_response

    with patch.object(storage_module.urllib.request, "urlopen", return_value=mock_response):
        with pytest.raises(StorageError):
            storage_module.upload_organization_logo(
                organization_id="org-1", content=b"x", image_format="png"
            )


def test_destroy_is_best_effort_returns_false_without_raising_when_unset(monkeypatch):
    monkeypatch.setattr(
        storage_module, "get_settings", lambda: _FakeSettings(cloudinary_cloud_name=None)
    )
    with patch.object(storage_module.urllib.request, "urlopen") as mock_urlopen:
        result = storage_module.destroy_organization_logo(organization_id="org-1")
    assert result is False
    mock_urlopen.assert_not_called()


def test_destroy_returns_false_on_network_failure_never_raises(monkeypatch):
    monkeypatch.setattr(
        storage_module, "get_settings", lambda: _FakeSettings(cloudinary_cloud_name="demo")
    )
    with patch.object(
        storage_module.urllib.request, "urlopen", side_effect=storage_module.urllib.error.URLError("boom")
    ):
        result = storage_module.destroy_organization_logo(organization_id="org-1")
    assert result is False


def test_signature_excludes_file_api_key_and_signature_itself():
    params = {"timestamp": "1700000000", "public_id": "lucratix/organizations/org-1"}
    signature = storage_module._sign(params, "supersecret")
    # Assinatura deterministica: mesmos parametros + segredo -> mesmo hash.
    assert signature == storage_module._sign(dict(params), "supersecret")
    # Segredo diferente muda a assinatura.
    assert signature != storage_module._sign(params, "outrosegredo")
