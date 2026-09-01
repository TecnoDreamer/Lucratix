"""Validação de conteúdo real do logotipo enviado — mesmo espírito de
`app/modules/imports/security.py`: assinatura de bytes, nunca a
extensão/Content-Type declarados pelo cliente (triviais de falsificar).

SVG é rejeitado deliberadamente (sem orçamento de sanitização segura nesta
rodada — um SVG malicioso pode embutir script). Bomba de dimensão (imagem
minúscula em bytes, gigantesca decodificada) não é parseada aqui — não
adicionamos Pillow só para isso (ver core/storage.py); o limite de 2 MB em
bytes mais o próprio limite de decodificação do Cloudinary cobrem a maioria
dos casos práticos. Documentado como limite aceito, não lacuna esquecida.
"""

ALLOWED_LOGO_FORMATS = {"png", "jpeg", "webp"}
_EXTENSION_TO_FORMAT = {".png": "png", ".jpg": "jpeg", ".jpeg": "jpeg", ".webp": "webp"}

MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
_JPEG_MAGIC = b"\xff\xd8\xff"


class ImageValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def _detect_format_from_signature(content: bytes) -> str | None:
    if content.startswith(_PNG_MAGIC):
        return "png"
    if content.startswith(_JPEG_MAGIC):
        return "jpeg"
    if content[0:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


def validate_logo(*, filename: str, content: bytes) -> str:
    """Levanta ImageValidationError com mensagem acionável. Devolve o
    formato detectado (para a transformação/extensão do upload)."""
    lower = filename.lower()
    extension_format = next((fmt for ext, fmt in _EXTENSION_TO_FORMAT.items() if lower.endswith(ext)), None)
    if extension_format is None:
        if lower.endswith(".svg"):
            raise ImageValidationError(
                "SVG não é aceito para logotipo — envie PNG, JPEG ou WEBP."
            )
        raise ImageValidationError(
            f"Extensão não suportada. Formatos aceitos: {', '.join(sorted(ALLOWED_LOGO_FORMATS))}."
        )

    if len(content) == 0:
        raise ImageValidationError("O arquivo está vazio.")

    if len(content) > MAX_LOGO_SIZE_BYTES:
        max_mb = MAX_LOGO_SIZE_BYTES / (1024 * 1024)
        raise ImageValidationError(f"Imagem maior que o limite de {max_mb:.0f} MB.")

    signature_format = _detect_format_from_signature(content)
    if signature_format is None:
        raise ImageValidationError(
            "O conteúdo do arquivo não corresponde a uma imagem PNG, JPEG ou WEBP válida."
        )
    if signature_format != extension_format:
        raise ImageValidationError(
            f"A extensão do arquivo não bate com o conteúdo real (detectado: {signature_format})."
        )

    return signature_format
