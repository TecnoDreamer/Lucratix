import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class UserWorkspacePreference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Preferencia de workspace por usuario+organizacao (ex.: quais cards de
    acesso rapido aparecem na Home e em que ordem).

    `quick_access` e NULLABLE de proposito: `NULL` significa "usuario nunca
    configurou, usar o padrao" — diferente de `[]`, que significa "desativou
    todos os cards". "Restaurar padrao" grava `NULL`, nao a lista padrao
    atual, para que um card novo adicionado numa versao futura apareca
    automaticamente para quem ja restaurou (ver modules/workspace_preferences).

    O registro de QUAIS cards existem (id, rota, papel minimo) fica no
    FRONTEND (apps/web/src/lib/quick-access.ts) — esta tabela guarda so ids
    opinativos e a ordem, nunca decide sozinha o que e "permitido" (isso e
    sempre recalculado a partir do papel atual do usuario, nunca confiado a
    partir do que foi salvo aqui).
    """

    __tablename__ = "user_workspace_preferences"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "organization_id", name="uq_user_workspace_preferences_user_org"
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    # [{"id": "analytics", "enabled": true}, ...], na ordem escolhida pelo
    # usuario. Ver docstring da classe sobre o significado de NULL vs [].
    quick_access: Mapped[list[dict[str, object]] | None] = mapped_column(JSONB, nullable=True)
