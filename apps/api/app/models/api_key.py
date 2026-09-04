import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class ApiKey(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Chave de API por organização — autentica ferramentas externas
    (Power BI, Looker Studio, automação de cliente) que não guardam cookie
    de navegador, restrita a leitura de analytics (ver
    docs/security/API_KEYS.md e app/core/api_key_auth.py).

    Nunca armazena o valor bruto — apenas o hash (SHA-256, mesmo mecanismo
    de `app/models/password_reset_token.py`). `key_prefix` não é segredo,
    só os primeiros caracteres do valor bruto, para a chave ser
    identificável numa lista sem poder ser reconstruída a partir dele.
    `revoked_at` marca revogação (nunca hard-delete — mesmo padrão de
    sessão); `last_used_at` é atualizado a cada autenticação bem-sucedida.
    """

    __tablename__ = "api_keys"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
