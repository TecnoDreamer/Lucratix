"""app/modules/organizations/logo_security.py::validate_logo — conteudo
real do arquivo, nunca a extensao/Content-Type declarados pelo cliente."""

import pytest

from app.modules.organizations.logo_security import ImageValidationError, validate_logo

_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
_JPEG_BYTES = b"\xff\xd8\xff" + b"\x00" * 20
_WEBP_BYTES = b"RIFF" + b"\x00" * 4 + b"WEBP" + b"\x00" * 20


def test_accepts_valid_png():
    fmt = validate_logo(filename="logo.png", content=_PNG_BYTES)
    assert fmt == "png"


def test_accepts_valid_jpeg():
    fmt = validate_logo(filename="logo.jpg", content=_JPEG_BYTES)
    assert fmt == "jpeg"


def test_accepts_valid_webp():
    fmt = validate_logo(filename="logo.webp", content=_WEBP_BYTES)
    assert fmt == "webp"


def test_rejects_svg_extension_explicitly():
    with pytest.raises(ImageValidationError, match="SVG"):
        validate_logo(filename="logo.svg", content=b"<svg></svg>")


def test_rejects_unknown_extension():
    with pytest.raises(ImageValidationError):
        validate_logo(filename="logo.gif", content=_PNG_BYTES)


def test_rejects_png_extension_with_jpeg_content():
    with pytest.raises(ImageValidationError, match="não bate"):
        validate_logo(filename="logo.png", content=_JPEG_BYTES)


def test_rejects_text_file_renamed_to_png():
    with pytest.raises(ImageValidationError):
        validate_logo(filename="logo.png", content=b"nao sou uma imagem de verdade")


def test_rejects_empty_content():
    with pytest.raises(ImageValidationError, match="vazio"):
        validate_logo(filename="logo.png", content=b"")


def test_rejects_content_over_size_limit():
    too_big = _PNG_BYTES + b"\x00" * (2 * 1024 * 1024)
    with pytest.raises(ImageValidationError, match="limite"):
        validate_logo(filename="logo.png", content=too_big)
