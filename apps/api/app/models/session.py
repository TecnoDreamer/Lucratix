import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class Session(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """RN-013: uma conta so pode ter uma sessao autenticada ativa por vez.

    Cada login cria uma linha aqui e revoga (`revoked_at`) qualquer sessao
    anterior do mesmo usuario na mesma transacao (ver app/core/sessions.py).
    A unicidade e garantida pelo indice unico parcial
    `uq_sessions_one_active_per_user` (migration 0007_sessions) — mesmo sob
    concorrencia, o banco nunca permite duas linhas com `revoked_at IS NULL`
    para o mesmo usuario. O `id` desta linha vira a claim `sid` embutida em
    ambos os tokens (access e refresh) emitidos naquele login; toda request
    autenticada valida que a sessao referenciada ainda esta ativa — um JWT
    com assinatura/expiracao validas nao basta (ver core/deps.py e a secao
    de sessao unica em docs/security/AUTHENTICATION.md).
    """

    __tablename__ = "sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Forense de incidente (auditoria de hardening, 2026-09) — "de onde veio
    # esta sessao?" sem precisar cruzar com audit_logs (que nao guarda IP).
    # Nullable, sem valor inventado para sessoes anteriores a esta coluna
    # existir (migration 0017_session_metadata). Nunca exibido em nenhuma
    # tela hoje — consulta direta (SQL/admin) durante investigacao real.
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
