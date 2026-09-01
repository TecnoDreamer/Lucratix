"""organizations: status/closed_at/closed_by/closure_reason/logo_url (2026-09-01)

Revision ID: 0014_organization_lifecycle_logo
Revises: 0013_user_workspace_preferences
Create Date: 2026-09-01

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0014_organization_lifecycle_logo"
down_revision: str | None = "0013_user_workspace_preferences"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

organization_status = postgresql.ENUM("active", "frozen", name="organization_status")


def upgrade() -> None:
    organization_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "organizations",
        sa.Column(
            "status",
            postgresql.ENUM("active", "frozen", name="organization_status", create_type=False),
            nullable=False,
            server_default="active",
        ),
    )
    op.add_column(
        "organizations", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "organizations",
        sa.Column(
            "closed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "organizations", sa.Column("closure_reason", sa.String(500), nullable=True)
    )
    op.add_column("organizations", sa.Column("logo_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "logo_url")
    op.drop_column("organizations", "closure_reason")
    op.drop_column("organizations", "closed_by")
    op.drop_column("organizations", "closed_at")
    op.drop_column("organizations", "status")
    organization_status.drop(op.get_bind(), checkfirst=True)
