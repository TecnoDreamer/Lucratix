"""experiments and experiment_variants tables

Revision ID: 0005_experiments
Revises: 0004_marketing_funnel
Create Date: 2026-08-21

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005_experiments"
down_revision: str | None = "0004_marketing_funnel"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # create_type=False: ver comentario equivalente em 0001_initial.py.
    experiment_status = postgresql.ENUM(
        "draft", "running", "finished", name="experiment_status", create_type=False
    )
    experiment_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "experiments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("hypothesis", sa.String(2000), nullable=False),
        sa.Column("page_or_process", sa.String(255), nullable=False),
        sa.Column("primary_metric", sa.String(255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", experiment_status, nullable=False, server_default="draft"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.clock_timestamp(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.clock_timestamp(), nullable=False
        ),
    )
    op.create_index("ix_experiments_organization_id", "experiments", ["organization_id"])

    op.create_table(
        "experiment_variants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "experiment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("experiments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("sample_size", sa.Integer(), nullable=True),
        sa.Column("conversions", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.clock_timestamp(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.clock_timestamp(), nullable=False
        ),
    )
    op.create_index("ix_experiment_variants_experiment_id", "experiment_variants", ["experiment_id"])


def downgrade() -> None:
    op.drop_index("ix_experiment_variants_experiment_id", table_name="experiment_variants")
    op.drop_table("experiment_variants")

    op.drop_index("ix_experiments_organization_id", table_name="experiments")
    op.drop_table("experiments")

    postgresql.ENUM(name="experiment_status").drop(op.get_bind(), checkfirst=True)
