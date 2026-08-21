"""products and financial_periods tables

Revision ID: 0003_products_financials
Revises: 0002_baselines
Create Date: 2026-08-21

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003_products_financials"
down_revision: str | None = "0002_baselines"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("price", sa.Numeric(14, 2), nullable=True),
        sa.Column("cost", sa.Numeric(14, 2), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_products_organization_id", "products", ["organization_id"])

    op.create_table(
        "financial_periods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("period", sa.Date(), nullable=False),
        sa.Column("revenue", sa.Numeric(14, 2), nullable=True),
        sa.Column("costs", sa.Numeric(14, 2), nullable=True),
        sa.Column("expenses", sa.Numeric(14, 2), nullable=True),
        sa.Column("marketing_investment", sa.Numeric(14, 2), nullable=True),
        sa.Column("taxes", sa.Numeric(14, 2), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_unique_constraint(
        "uq_financial_period_org_period", "financial_periods", ["organization_id", "period"]
    )
    op.create_index(
        "ix_financial_periods_organization_id", "financial_periods", ["organization_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_financial_periods_organization_id", table_name="financial_periods")
    op.drop_constraint(
        "uq_financial_period_org_period", "financial_periods", type_="unique"
    )
    op.drop_table("financial_periods")

    op.drop_index("ix_products_organization_id", table_name="products")
    op.drop_table("products")
