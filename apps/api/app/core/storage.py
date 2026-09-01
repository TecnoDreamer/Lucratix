"""Upload de logotipo de organização via Cloudinary (RF de gestão de
empresas, 2026-09-01).

Mesmo espírito de baixa dependência do `core/email.py` — `urllib.request`
da biblioteca padrão, nenhum SDK. Upload assinado usando o corpo `file`
como `data:` URI base64 (aceito pela própria API do Cloudinary) em vez de
montar um corpo multipart na mão: `urllib.parse.urlencode` + um POST
`application/x-www-form-urlencoded` de sempre, sem precisar gerar boundary
nem depender de `python-multipart` (que só faz o FastAPI ENTENDER upload
recebido, não CONSTRUIR um upload de saída). Custo: ~33% a mais de payload
(2 MB → ~2.7 MB), bem dentro do limite do Cloudinary.

Diferença deliberada em relação a `send_email`: e-mail é efeito colateral
de uma ação que já teve sucesso (a conta existe de qualquer jeito), então
falhar em silêncio é honesto. Upload de logo É a própria ação que o
usuário pediu — devolver sucesso sem o logo estaria mentindo. Por isso
`upload_organization_logo` LEVANTA exceção em vez de devolver
True/False/None; o router mapeia para 502/503.
"""

import base64
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from app.core.config import get_settings

_UPLOAD_URL = "https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
_DESTROY_URL = "https://api.cloudinary.com/v1_1/{cloud_name}/image/destroy"
_TIMEOUT_SECONDS = 15
_LOGO_FOLDER = "lucratix/organizations"
# Cloudinary redimensiona no proprio upload (nunca aumenta, so limita o
# maximo, preservando proporcao) — evita adicionar Pillow so pra isso.
_EAGER_TRANSFORMATION = "c_limit,w_512,h_512"


class StorageNotConfiguredError(Exception):
    def __init__(self) -> None:
        super().__init__("Upload de logo não está configurado neste ambiente.")


_DEFAULT_STORAGE_ERROR = "Não foi possível enviar a imagem agora. Tente novamente em instantes."


class StorageError(Exception):
    def __init__(self, message: str = _DEFAULT_STORAGE_ERROR):
        self.message = message
        super().__init__(message)


def _require_configured() -> tuple[str, str, str]:
    settings = get_settings()
    if not (
        settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret
    ):
        raise StorageNotConfiguredError()
    return settings.cloudinary_cloud_name, settings.cloudinary_api_key, settings.cloudinary_api_secret


def _sign(params: dict[str, str], api_secret: str) -> str:
    # Assinatura exigida pelo proprio Cloudinary pra autenticar a requisicao
    # contra um segredo compartilhado — SHA-1 aqui nao e uma escolha nossa
    # de hash de seguranca, e o algoritmo que a API deles espera.
    to_sign = "&".join(f"{key}={params[key]}" for key in sorted(params)) + api_secret
    return hashlib.sha1(to_sign.encode("utf-8")).hexdigest()  # noqa: S324 # nosec B324


def upload_organization_logo(*, organization_id: str, content: bytes, image_format: str) -> str:
    """Devolve a `secure_url` da imagem (ja redimensionada). Levanta
    `StorageNotConfiguredError`/`StorageError` em qualquer falha — nunca
    devolve sucesso parcial."""
    cloud_name, api_key, api_secret = _require_configured()

    public_id = f"{_LOGO_FOLDER}/{organization_id}"
    params = {
        "eager": _EAGER_TRANSFORMATION,
        "invalidate": "true",
        "overwrite": "true",
        "public_id": public_id,
        "timestamp": str(int(time.time())),
    }
    signature = _sign(params, api_secret)

    body = urllib.parse.urlencode(
        {
            **params,
            "api_key": api_key,
            "signature": signature,
            "file": f"data:image/{image_format};base64,{base64.b64encode(content).decode('ascii')}",
        }
    ).encode("utf-8")

    # URL montada só a partir de settings (nunca de entrada do usuário) —
    # mesma justificativa de core/email.py. noqa/nosec no Request() e no
    # urlopen() porque a URL não é um literal simples (tem .format()).
    url = _UPLOAD_URL.format(cloud_name=cloud_name)
    request = urllib.request.Request(  # noqa: S310 # nosec B310
        url, data=body, method="POST", headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(request, timeout=_TIMEOUT_SECONDS) as response:  # noqa: S310 # nosec B310
            status_code = int(response.status)
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError) as exc:
        raise StorageError() from exc

    if not (200 <= status_code < 300):
        raise StorageError()

    eager = payload.get("eager") or []
    secure_url = eager[0].get("secure_url") if eager else payload.get("secure_url")
    if not secure_url:
        raise StorageError()
    return str(secure_url)


def destroy_organization_logo(*, organization_id: str) -> bool:
    """Best-effort, nunca levanta excecao — o banco (organization.logo_url)
    e' a fonte da verdade sobre "tem logo ou nao"; uma falha aqui nao pode
    impedir o usuario de remover/substituir o logo na propria plataforma."""
    settings = get_settings()
    if not (
        settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret
    ):
        return False

    public_id = f"{_LOGO_FOLDER}/{organization_id}"
    params = {"invalidate": "true", "public_id": public_id, "timestamp": str(int(time.time()))}
    signature = _sign(params, settings.cloudinary_api_secret)

    body = urllib.parse.urlencode(
        {**params, "api_key": settings.cloudinary_api_key, "signature": signature}
    ).encode("utf-8")
    url = _DESTROY_URL.format(cloud_name=settings.cloudinary_cloud_name)
    request = urllib.request.Request(  # noqa: S310 # nosec B310
        url, data=body, method="POST", headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(request, timeout=_TIMEOUT_SECONDS) as response:  # noqa: S310 # nosec B310
            return 200 <= int(response.status) < 300
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"[storage] falha ao remover logo de {organization_id!r}: {exc}")
        return False
