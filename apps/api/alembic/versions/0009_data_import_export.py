"""data import/export module — import_jobs, import_errors, import_mapping_templates (2026-08-29)

Revision ID: 0009_data_import_export
Revises: 0008_performance_indexes
Create Date: 2026-08-29

Sem storage de arquivo persistente (nao existe S3/volume na infraestrutura
atual) e sem fila de jobs (Redis/Celery) — ver docs/data-import-export/ARCHITECTURE.md.
`import_jobs.raw_rows`/`headers`/`mapping` guardam o conteudo parseado do
arquivo (JSONB), nao o arquivo em si, o que torna o wizard (varios requests
HTTP separados: upload -> mapping -> preview -> confirm) stateless e seguro
para multiplos processos, sem depender de sessao em memoria nem de disco.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_data_import_export"
down_revision: str | None = "0008_performance_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "import_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("domain", sa.String(50), nullable=False),
        sa.Column("source_filename", sa.String(255), nullable=False),
        sa.Column("file_format", sa.String(10), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="UPLOADED"),
        sa.Column("headers", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("mapping", postgresql.JSONB, nullable=True),
        sa.Column("transform_config", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("raw_rows", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("total_rows", sa.Integer, nullable=True),
        sa.Column("valid_rows", sa.Integer, nullable=True),
        sa.Column("invalid_rows", sa.Integer, nullable=True),
        sa.Column("duplicate_rows", sa.Integer, nullable=True),
        sa.Column("created_rows", sa.Integer, nullable=True),
        sa.Column("updated_rows", sa.Integer, nullable=True),
        sa.Column("skipped_rows", sa.Integer, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.clock_timestamp(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.clock_timestamp(),
            nullable=False,
        ),
    )
    # Historico ordenado por data (listagem) e filtro por status (ex.: "so
    # falhas") — os dois padroes reais de consulta da tela de historico.
    op.create_index(
        "ix_import_jobs_organization_id_created_at",
        "import_jobs",
        ["organization_id", "created_at"],
    )
    op.create_index(
        "ix_import_jobs_organization_id_status",
        "import_jobs",
        ["organization_id", "status"],
    )

    op.create_table(
        "import_errors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "import_job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("import_jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("row_number", sa.Integer, nullable=False),
        sa.Column("field", sa.String(100), nullable=True),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("raw_value", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.clock_timestamp(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_import_errors_import_job_id_row_number",
        "import_errors",
        ["import_job_id", "row_number"],
    )

    op.create_table(
        "import_mapping_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("domain", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("mapping", postgresql.JSONB, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.clock_timestamp(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id", "domain", "name", name="uq_import_mapping_template_org_domain_name"
        ),
    )
    op.create_index(
        "ix_import_mapping_templates_organization_id_domain",
        "import_mapping_templates",
        ["organization_id", "domain"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_import_mapping_templates_organization_id_domain",
        table_name="import_mapping_templates",
    )
    op.drop_table("import_mapping_templates")

    op.drop_index("ix_import_errors_import_job_id_row_number", table_name="import_errors")
    op.drop_table("import_errors")

    op.drop_index("ix_import_jobs_organization_id_status", table_name="import_jobs")
    op.drop_index("ix_import_jobs_organization_id_created_at", table_name="import_jobs")
    op.drop_table("import_jobs")
