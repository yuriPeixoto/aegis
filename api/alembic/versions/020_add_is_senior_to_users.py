"""add_is_senior_to_users

Revision ID: 020
Revises: 019_add_merge_fields
Create Date: 2026-03-27 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "020_add_is_senior"
down_revision = "019_add_merge_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_senior", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("users", "is_senior")
