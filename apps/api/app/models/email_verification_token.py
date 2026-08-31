import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class EmailVerificationToken(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """RF-001: token de uso unico e curta duracao para confirmar que o
    usuario e dono do e-mail de cadastro. Mesma forma de
    `app/models/password_reset_token.py` (nunca armazena o token em texto
    plano, so o hash) — deliberadamente um model separado, nao o mesmo
    token reaproveitado para dois propositos diferentes (evita um bug de
    categoria: um token de "esqueci minha senha" nunca deve conseguir
    marcar um e-mail como verificado, e vice-versa).
    """

    __tablename__ = "email_verification_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
