"""link attachments to messages

Revision ID: 012
Revises: 011
Create Date: 2026-03-23
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ticket_attachments",
        sa.Column(
            "message_id",
            sa.Integer(),
            sa.ForeignKey("ticket_messages.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("ticket_attachments", "message_id")
