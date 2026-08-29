import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class ImportRowError(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Erro/aviso de uma linha especifica de um ImportJob — permite relatorio
    de rejeicoes para correcao offline (prompt mestre, secao 40). Append-only:
    recalculado do zero a cada validacao (ver service.validate_import_job).
    """

    __tablename__ = "import_errors"

    import_job_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False
    )
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    field: Mapped[str | None] = mapped_column(String(100), nullable=True)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    raw_value: Mapped[str | None] = mapped_column(String(500), nullable=True)
