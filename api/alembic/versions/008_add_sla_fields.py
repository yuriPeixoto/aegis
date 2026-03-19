"""add sla_hours to sources and sla_due_at to tickets

Revision ID: 008
Revises: 007
Create Date: 2026-03-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sources", sa.Column("sla_hours", sa.Integer, nullable=True))
    op.add_column("tickets", sa.Column("sla_due_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("tickets", "sla_due_at")
    op.drop_column("sources", "sla_hours")
