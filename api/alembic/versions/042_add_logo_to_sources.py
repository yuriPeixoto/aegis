"""add_logo_to_sources

Revision ID: 042
Revises: 041
Create Date: 2026-09-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision: str = "042"
down_revision: str | None = "041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sources",
        sa.Column("logo", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sources", "logo")
