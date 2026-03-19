"""add assigned_to_user_id to tickets

Revision ID: 006
Revises: 005
Create Date: 2026-03-18

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tickets",
        sa.Column("assigned_to_user_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_tickets_assigned_to_user",
        "tickets",
        "users",
        ["assigned_to_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_tickets_assigned_to_user_id", "tickets", ["assigned_to_user_id"])


def downgrade() -> None:
    op.drop_index("ix_tickets_assigned_to_user_id", table_name="tickets")
    op.drop_constraint("fk_tickets_assigned_to_user", "tickets", type_="foreignkey")
    op.drop_column("tickets", "assigned_to_user_id")
