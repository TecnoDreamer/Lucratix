"""baselines table (append-only)

Revision ID: 0002_baselines
Revises: 0001_initial
Create Date: 2026-08-21

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_baselines"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "baselines",
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
        sa.Column("revenue", sa.Numeric(14, 2), nullable=True),
        sa.Column("profit", sa.Numeric(14, 2), nullable=True),
        sa.Column("margin", sa.Numeric(7, 4), nullable=True),
        sa.Column("customer_count", sa.Integer(), nullable=True),
        sa.Column("cac", sa.Numeric(14, 2), nullable=True),
        sa.Column("conversion_rate", sa.Numeric(7, 4), nullable=True),
        sa.Column("average_ticket", sa.Numeric(14, 2), nullable=True),
        sa.Column("marketing_investment", sa.Numeric(14, 2), nullable=True),
        sa.Column("leads", sa.Integer(), nullable=True),
        sa.Column("recurrence_rate", sa.Numeric(7, 4), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_baselines_organization_id", "baselines", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_baselines_organization_id", table_name="baselines")
    op.drop_table("baselines")
