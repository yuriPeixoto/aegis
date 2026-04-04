"""add_avatar_to_users

Revision ID: 028
Revises: 027
Create Date: 2026-04-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "avatar")
