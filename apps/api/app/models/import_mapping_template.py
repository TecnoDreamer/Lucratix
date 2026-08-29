import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class ImportMappingTemplate(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Mapeamento de campos salvo por uma organizacao para reuso (prompt
    mestre, secao 8: "Permitir salvar templates, por exemplo 'ERP legado
    2024'"). Escopado por organizacao + dominio — nunca compartilhado entre
    organizacoes (RNF-002).
    """

    __tablename__ = "import_mapping_templates"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "domain", "name", name="uq_import_mapping_template_org_domain_name"
        ),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    domain: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # {header_normalizado: canonical_field}
    mapping: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=False)
