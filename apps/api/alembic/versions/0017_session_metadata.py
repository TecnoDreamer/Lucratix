"""sessions: ip_address, user_agent (2026-09-03)

Revision ID: 0017_session_metadata
Revises: 0016_funnel_snapshot_channel
Create Date: 2026-09-03

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0017_session_metadata"
down_revision: str | None = "0016_funnel_snapshot_channel"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Sem server_default de proposito: sessoes criadas antes desta migration
    # ficam com NULL (nunca um valor inventado) — auditoria de hardening
    # (2026-09), forense de incidente ("de onde veio esta sessao?").
    op.add_column("sessions", sa.Column("ip_address", sa.String(45), nullable=True))
    op.add_column("sessions", sa.Column("user_agent", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "user_agent")
    op.drop_column("sessions", "ip_address")
