"""add_color_to_calendar_events

Revision ID: 039
Revises: 038
Create Date: 2026-09-04 00:00:00.000000

Adiciona color (override manual, "#RRGGBB") em calendar_events (Aegis #1250, item #595).
Cor de exibição: color manual > cor da 1ª tag do ticket vinculado > cor padrão do tipo.
"""
from alembic import op
import sqlalchemy as sa

revision: str = "039"
down_revision: str | None = "038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "calendar_events",
        sa.Column("color", sa.String(7), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("calendar_events", "color")
