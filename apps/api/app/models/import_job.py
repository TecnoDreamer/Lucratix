import uuid
from enum import StrEnum

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ImportJobStatus(StrEnum):
    """Estados reais para processamento sincrono (sem fila de jobs — ver
    docs/data-import-export/ARCHITECTURE.md sobre a decisao de nao introduzir
    Celery/Redis nesta versao, dado que a aplicacao roda em réplica única no
    Railway). QUEUED/PROCESSING do fluxo conceitual do prompt mestre nao
    existem como estado persistido: a confirmacao processa e retorna no
    mesmo request.
    """

    UPLOADED = "UPLOADED"
    MAPPING_REQUIRED = "MAPPING_REQUIRED"
    READY = "READY"
    COMPLETED = "COMPLETED"
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ImportJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Um job de importacao de arquivo — RF novo, modulo de dados (2026-08-29).

    Sem storage persistente de arquivo (nao existe S3/volume na
    infraestrutura atual — ver auditoria em docs/data-import-export/ARCHITECTURE.md):
    o arquivo e parseado uma unica vez no upload e as linhas cruas ficam em
    `raw_rows` (JSONB), nao no disco. Isso torna o fluxo do wizard
    (upload -> mapping -> preview -> confirm, requests HTTP separados)
    stateless e seguro para múltiplos processos/workers, sem depender de
    sessao em memoria.
    """

    __tablename__ = "import_jobs"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    domain: Mapped[str] = mapped_column(String(50), nullable=False)
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_format: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=ImportJobStatus.UPLOADED.value
    )

    # Cabecalhos detectados no arquivo, na ordem original.
    headers: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    # {header_original: canonical_field | None} — confirmado pelo usuario na
    # etapa de mapeamento (a sugestao automatica fica em memoria/response,
    # nunca persistida como se fosse decisao do usuario — RN/prompt secao 8:
    # "sugestao nao e autorizacao").
    mapping: Mapped[dict[str, str] | None] = mapped_column(JSONB, nullable=True)
    # Opcoes de transformacao confirmadas (ex.: {"date_format": "DMY"}).
    transform_config: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False, default=dict)
    # [{"row_number": int, "values": {header: valor_cru}}], capturado uma vez
    # no upload.
    raw_rows: Mapped[list[dict[str, object]]] = mapped_column(JSONB, nullable=False, default=list)

    total_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    valid_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    invalid_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duplicate_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skipped_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
