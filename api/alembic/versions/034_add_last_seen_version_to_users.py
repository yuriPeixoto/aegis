"""add_last_seen_version_to_users

Revision ID: 034
Revises: 033
Create Date: 2026-07-22 00:00:00.000000

Suporta o modal "novidades" (what's new) pós-bump de versão — ticket #975.
Backfill pra versão atual: usuários existentes não veem de uma vez todo o
changelog acumulado até aqui, só a partir do próximo bump.
"""
from alembic import op
import sqlalchemy as sa

revision: str = "034"
down_revision: str | None = "033"
branch_labels = None
depends_on = None

_CURRENT_VERSION_AT_MIGRATION_TIME = "1.2.1"


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_seen_version", sa.String(50), nullable=True),
    )
    op.execute(
        f"UPDATE users SET last_seen_version = '{_CURRENT_VERSION_AT_MIGRATION_TIME}' "
        "WHERE last_seen_version IS NULL"
    )


def downgrade() -> None:
    op.drop_column("users", "last_seen_version")
