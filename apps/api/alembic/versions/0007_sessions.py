"""sessions table (RN-013 — sessao unica por conta)

Revision ID: 0007_sessions
Revises: 0006_password_reset_tokens
Create Date: 2026-08-25

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007_sessions"
down_revision: str | None = "0006_password_reset_tokens"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.clock_timestamp(),
            nullable=False,
        ),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    # Garante, no proprio banco, que nunca existam duas sessoes ativas
    # (revoked_at IS NULL) para o mesmo usuario — a atomicidade da regra
    # de sessao unica nao depende so da ordem das instrucoes na aplicacao
    # (ver app/core/sessions.py::create_session).
    op.create_index(
        "uq_sessions_one_active_per_user",
        "sessions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("revoked_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_sessions_one_active_per_user", table_name="sessions")
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")
