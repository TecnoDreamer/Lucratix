"""user_workspace_preferences table (workspace personalization, 2026-08-31)

Revision ID: 0013_user_workspace_preferences
Revises: 0012_email_verification
Create Date: 2026-08-31

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0013_user_workspace_preferences"
down_revision: str | None = "0012_email_verification"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_workspace_preferences",
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
        sa.Column("quick_access", postgresql.JSONB(), nullable=True),
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
        "uq_user_workspace_preferences_user_org",
        "user_workspace_preferences",
        ["user_id", "organization_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_user_workspace_preferences_user_org",
        "user_workspace_preferences",
        type_="unique",
    )
    op.drop_table("user_workspace_preferences")
