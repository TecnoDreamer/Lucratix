"""funnel_snapshots: channel_id opcional (2026-09-02)

Revision ID: 0016_funnel_snapshot_channel
Revises: 0015_user_locale_preference
Create Date: 2026-09-02

RF funil multicanal (secao 1 do prompt): funnel_snapshots ganha uma
dimensao opcional de canal, nullable, para nao exigir migracao de dado
historico (toda linha existente permanece "agregado" = channel_id NULL).

Postgres trata NULL como distinto em UNIQUE — sem cuidado, varias linhas
"agregado" poderiam coexistir para a mesma organizacao+periodo. A
constraint composta (organization_id, period, channel_id) sozinha nao
resolve isso (duas linhas com channel_id NULL nao colidem nela), entao
um indice unico parcial (WHERE channel_id IS NULL) garante no maximo uma
linha agregada por organizacao+periodo. Ver docs/funnel/MODELAGEM.md.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0016_funnel_snapshot_channel"
down_revision: str | None = "0015_user_locale_preference"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "funnel_snapshots",
        sa.Column(
            "channel_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("marketing_channels.id", ondelete="RESTRICT"),
            nullable=True,
        ),
    )

    op.drop_constraint("uq_funnel_snapshot_org_period", "funnel_snapshots", type_="unique")
    op.create_unique_constraint(
        "uq_funnel_snapshot_org_period_channel",
        "funnel_snapshots",
        ["organization_id", "period", "channel_id"],
    )
    op.create_index(
        "ix_funnel_snapshot_org_period_aggregate",
        "funnel_snapshots",
        ["organization_id", "period"],
        unique=True,
        postgresql_where=sa.text("channel_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_funnel_snapshot_org_period_aggregate", table_name="funnel_snapshots")
    op.drop_constraint("uq_funnel_snapshot_org_period_channel", "funnel_snapshots", type_="unique")
    op.create_unique_constraint(
        "uq_funnel_snapshot_org_period", "funnel_snapshots", ["organization_id", "period"]
    )
    op.drop_column("funnel_snapshots", "channel_id")
