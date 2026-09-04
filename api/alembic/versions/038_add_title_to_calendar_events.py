"""add_title_to_calendar_events

Revision ID: 038
Revises: 037
Create Date: 2026-09-04 00:00:00.000000

Adiciona title em calendar_events, pro tipo genérico "task" (Aegis #1250, item #594).
"""
from alembic import op
import sqlalchemy as sa

revision: str = "038"
down_revision: str | None = "037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "calendar_events",
        sa.Column("title", sa.String(200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("calendar_events", "title")
