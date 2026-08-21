"""marketing_channels, campaigns and funnel_snapshots tables

Revision ID: 0004_marketing_funnel
Revises: 0003_products_financials
Create Date: 2026-08-21

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004_marketing_funnel"
down_revision: str | None = "0003_products_financials"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "marketing_channels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(100), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_marketing_channels_organization_id", "marketing_channels", ["organization_id"])

    op.create_table(
        "campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "channel_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("marketing_channels.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("investment", sa.Numeric(14, 2), nullable=True),
        sa.Column("impressions", sa.Integer(), nullable=True),
        sa.Column("clicks", sa.Integer(), nullable=True),
        sa.Column("leads", sa.Integer(), nullable=True),
        sa.Column("opportunities", sa.Integer(), nullable=True),
        sa.Column("customers", sa.Integer(), nullable=True),
        sa.Column("attributed_revenue", sa.Numeric(14, 2), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_campaigns_organization_id", "campaigns", ["organization_id"])
    op.create_index("ix_campaigns_channel_id", "campaigns", ["channel_id"])

    op.create_table(
        "funnel_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("period", sa.Date(), nullable=False),
        sa.Column("impressions", sa.Integer(), nullable=True),
        sa.Column("visits", sa.Integer(), nullable=True),
        sa.Column("leads", sa.Integer(), nullable=True),
        sa.Column("mqls", sa.Integer(), nullable=True),
        sa.Column("sqls", sa.Integer(), nullable=True),
        sa.Column("opportunities", sa.Integer(), nullable=True),
        sa.Column("customers", sa.Integer(), nullable=True),
        sa.Column("repeat_purchases", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_unique_constraint(
        "uq_funnel_snapshot_org_period", "funnel_snapshots", ["organization_id", "period"]
    )
    op.create_index("ix_funnel_snapshots_organization_id", "funnel_snapshots", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_funnel_snapshots_organization_id", table_name="funnel_snapshots")
    op.drop_constraint("uq_funnel_snapshot_org_period", "funnel_snapshots", type_="unique")
    op.drop_table("funnel_snapshots")

    op.drop_index("ix_campaigns_channel_id", table_name="campaigns")
    op.drop_index("ix_campaigns_organization_id", table_name="campaigns")
    op.drop_table("campaigns")

    op.drop_index("ix_marketing_channels_organization_id", table_name="marketing_channels")
    op.drop_table("marketing_channels")
