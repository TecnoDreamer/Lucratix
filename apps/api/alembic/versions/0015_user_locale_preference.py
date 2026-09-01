"""users: locale (2026-09-01)

Revision ID: 0015_user_locale_preference
Revises: 0014_organization_lifecycle_logo
Create Date: 2026-09-01

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0015_user_locale_preference"
down_revision: str | None = "0014_organization_lifecycle_logo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Sem server_default de proposito: NULL significa "nunca escolheu, usa
    # o padrao pt-BR" (aplicado no frontend), nao um valor igual a pt-BR
    # gravado por acaso — mesma semantica de email_verified_at.
    op.add_column("users", sa.Column("locale", sa.String(5), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "locale")
