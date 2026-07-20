"""add_api_key_to_users

Revision ID: 033
Revises: 032
Create Date: 2026-07-16 00:00:00.000000

Personal API key por usuário — permite autenticar integrações (MCP, scripts)
sem guardar email/senha em texto plano. Mesmo padrão já usado em `sources`
(api_key_hash com SHA-256), aplicado a `users`. Ver auth.py / core/auth.py.
"""
from alembic import op
import sqlalchemy as sa

revision: str = "033"
down_revision: str | None = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("api_key_hash", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "api_key_hash")
