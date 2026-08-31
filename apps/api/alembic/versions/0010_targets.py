"""targets table (metas por KPI/mes — evolucao do Analytics, 2026-08-31)

Revision ID: 0010_targets
Revises: 0009_data_import_export
Create Date: 2026-08-31

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010_targets"
down_revision: str | None = "0009_data_import_export"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # create_type=False: ver comentario equivalente em 0001_initial.py.
    target_metric = postgresql.ENUM(
        "revenue",
        "profit",
        "margin",
        "cac",
        "conversion_rate",
        "average_ticket",
        "recurrence_rate",
        name="target_metric",
        create_type=False,
    )
    target_metric.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "targets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("metric", target_metric, nullable=False),
        sa.Column("period", sa.Date(), nullable=False),
        sa.Column("value", sa.Numeric(14, 4), nullable=False),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.clock_timestamp(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.clock_timestamp(), nullable=False
        ),
        sa.UniqueConstraint("organization_id", "metric", "period", name="uq_targets_org_metric_period"),
    )
    # Indice unico ja cobre organization_id como prefixo esquerdo — nenhum
    # indice adicional necessario pro padrao de consulta atual (sempre
    # filtra organization_id, geralmente junto de metric/period).


def downgrade() -> None:
    op.drop_table("targets")
    postgresql.ENUM(name="target_metric").drop(op.get_bind(), checkfirst=True)
