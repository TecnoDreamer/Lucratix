from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/marketing_platform"

    jwt_secret_key: str = "change-me-in-env-never-commit-a-real-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    cors_allowed_origins: list[str] = ["http://localhost:3000"]

    cookie_secure: bool = False

    # Defesa contra forca bruta (docs/security/RATE_LIMITING.md): quantos
    # hops de proxy confiavel existem na frente da API, pra `client_ip.py`
    # saber quantas posicoes contar a partir da DIREITA de `X-Forwarded-For`.
    # 0 (padrao) = nenhum proxy confiavel conhecido — usa so
    # `request.client.host`, nunca um header que o proprio cliente controla.
    # So mudar se um proxy/CDN confiavel (ex.: Cloudflare) for colocado na
    # frente do Railway; nenhum ponto de chamada precisa mudar alem disso.
    trusted_proxy_count: int = 0

    # E-mail transacional (RF-001, confirmação de conta; reaproveitado por
    # reset de senha e criação de conta por admin — ver app/core/email.py).
    # `resend_api_key=None` (padrão) mantém o comportamento de hoje (nenhuma
    # chamada de rede, fallback `dev_token` fora de produção) — a feature
    # liga sozinha quando a env var aparecer, sem precisar de deploy novo.
    resend_api_key: str | None = None
    # Sandbox do Resend — só entrega para quem criou a conta no Resend até
    # um domínio próprio ser verificado (ver docs/security/AUTHENTICATION.md).
    email_from: str = "Lucratix <onboarding@resend.dev>"
    # Base para montar o link completo dentro do corpo do e-mail (antes,
    # o token cru bastava porque só aparecia na resposta JSON, pro próprio
    # frontend montar a URL).
    frontend_base_url: str = "http://localhost:3000"

    # Logotipo de organização via Cloudinary (PR "gestão de empresas",
    # 2026-09-01). Mesmo padrão do `resend_api_key`: qualquer um `None`
    # (padrão) mantém a feature desligada — nenhuma chamada de rede, upload
    # devolve 503 "não configurado" — liga sozinha quando as 3 env vars
    # aparecerem, sem precisar de deploy novo. Ver app/core/storage.py.
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
