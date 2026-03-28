"""create_saved_views

Revision ID: 023
Revises: 022
Create Date: 2026-03-28 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "saved_views",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("icon", sa.String(10), nullable=False, server_default="📋"),
        # NULL user_id = belongs to system (shared by default)
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("is_shared", sa.Boolean(), nullable=False, server_default="false"),
        # Serialised TicketFilters — assigned_to accepts "me"|"unassigned"|null
        sa.Column("filters", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_saved_views_user_id", "saved_views", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_saved_views_user_id", "saved_views")
    op.drop_table("saved_views")
