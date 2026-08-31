"""import_jobs.sheet_name (selecao de aba em .xlsx multi-aba, 2026-08-31)

Revision ID: 0011_import_job_sheet_name
Revises: 0010_targets
Create Date: 2026-08-31

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011_import_job_sheet_name"
down_revision: str | None = "0010_targets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("import_jobs", sa.Column("sheet_name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("import_jobs", "sheet_name")
