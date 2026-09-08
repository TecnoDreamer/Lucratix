"""user_chart_preferences table (personalização de gráficos, 2026-09-08)

Revision ID: 0019_user_chart_preferences
Revises: 0018_api_keys
Create Date: 2026-09-08

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0019_user_chart_preferences"
down_revision: str | None = "0018_api_keys"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_chart_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chart_key", sa.String(64), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("preferences_json", postgresql.JSONB(), nullable=True),
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
    op.create_unique_constraint(
        "uq_user_chart_preferences_user_org_chart",
        "user_chart_preferences",
        ["user_id", "organization_id", "chart_key"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_user_chart_preferences_user_org_chart",
        "user_chart_preferences",
        type_="unique",
    )
    op.drop_table("user_chart_preferences")
