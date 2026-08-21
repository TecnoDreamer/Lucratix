import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )


class CreatedAtMixin:
    # clock_timestamp() (hora real de execucao da instrucao), nao now()
    # (hora de inicio da transacao): duas linhas inseridas na MESMA
    # transacao teriam o mesmo now(), tornando "ORDER BY created_at DESC"
    # ambiguo — critico para baselines/audit_logs, que dependem de
    # created_at para definir o registro "mais recente" (RN-002, ADR-0005).
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp(), nullable=False
    )


class TimestampMixin(CreatedAtMixin):
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.clock_timestamp(),
        onupdate=func.clock_timestamp(),
        nullable=False,
    )
