"""add_webhook_url_internal_to_sources

Revision ID: 027
Revises: 026
Create Date: 2026-03-31 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sources",
        sa.Column("webhook_url_internal", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sources", "webhook_url_internal")
