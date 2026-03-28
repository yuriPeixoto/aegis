"""add_csat_to_tickets

Revision ID: 026
Revises: 025
Create Date: 2026-03-28 12:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("csat_rating", sa.SmallInteger(), nullable=True))
    op.add_column("tickets", sa.Column("csat_comment", sa.Text(), nullable=True))
    op.add_column(
        "tickets",
        sa.Column("csat_submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "tickets",
        sa.Column("csat_requested_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tickets", "csat_requested_at")
    op.drop_column("tickets", "csat_submitted_at")
    op.drop_column("tickets", "csat_comment")
    op.drop_column("tickets", "csat_rating")
