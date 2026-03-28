"""add_csat_to_sources

Revision ID: 025
Revises: 024
Create Date: 2026-03-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sources",
        sa.Column("csat_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "sources",
        sa.Column("csat_sampling_pct", sa.Integer(), nullable=False, server_default="100"),
    )


def downgrade() -> None:
    op.drop_column("sources", "csat_sampling_pct")
    op.drop_column("sources", "csat_enabled")
