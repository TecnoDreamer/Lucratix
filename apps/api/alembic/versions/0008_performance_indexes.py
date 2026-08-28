"""performance indexes for created_at/start_date ordering (auditoria de banco, 2026-08-27)

Revision ID: 0008_performance_indexes
Revises: 0007_sessions
Create Date: 2026-08-27

Substitui 4 indices de coluna unica por indices compostos, nas tabelas onde o
codigo real sempre filtra por organization_id E ordena/filtra por uma segunda
coluna (created_at ou start_date) na mesma consulta — auditoria encontrou
esses 4 padroes sem indice de suporte para a segunda coluna:

- audit_logs: ORDER BY created_at DESC LIMIT (tabela append-only, so cresce)
- baselines:  ORDER BY created_at DESC (get_current_baseline usa .first())
- experiments: ORDER BY created_at DESC
- campaigns:  filtro de intervalo por start_date/end_date (analytics de
  marketing) alem do ORDER BY start_date da listagem simples

O indice composto (organization_id, <coluna>) continua servindo consultas
que filtram só por organization_id (prefixo esquerdo do indice), entao o
indice antigo de coluna unica fica redundante — removido para nao pagar
manutencao de escrita em dois indices cobrindo o mesmo caso de uso.

Nao foi criado indice cobrindo directly o filtro de end_date de
list_campaigns_in_range (intervalo com OR entre start_date/end_date) — fora
do escopo desta auditoria, que so cobre o que ja tem uso real comprovado no
codigo (ver docs/database/DECISIONS.md).
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0008_performance_indexes"
down_revision: str | None = "0007_sessions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_audit_logs_organization_id", table_name="audit_logs")
    op.create_index(
        "ix_audit_logs_organization_id_created_at",
        "audit_logs",
        ["organization_id", "created_at"],
    )

    op.drop_index("ix_baselines_organization_id", table_name="baselines")
    op.create_index(
        "ix_baselines_organization_id_created_at",
        "baselines",
        ["organization_id", "created_at"],
    )

    op.drop_index("ix_experiments_organization_id", table_name="experiments")
    op.create_index(
        "ix_experiments_organization_id_created_at",
        "experiments",
        ["organization_id", "created_at"],
    )

    op.drop_index("ix_campaigns_organization_id", table_name="campaigns")
    op.create_index(
        "ix_campaigns_organization_id_start_date",
        "campaigns",
        ["organization_id", "start_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_campaigns_organization_id_start_date", table_name="campaigns")
    op.create_index("ix_campaigns_organization_id", "campaigns", ["organization_id"])

    op.drop_index("ix_experiments_organization_id_created_at", table_name="experiments")
    op.create_index("ix_experiments_organization_id", "experiments", ["organization_id"])

    op.drop_index("ix_baselines_organization_id_created_at", table_name="baselines")
    op.create_index("ix_baselines_organization_id", "baselines", ["organization_id"])

    op.drop_index("ix_audit_logs_organization_id_created_at", table_name="audit_logs")
    op.create_index("ix_audit_logs_organization_id", "audit_logs", ["organization_id"])
