"""add_recurrence_group_id_to_calendar_events

Revision ID: 041
Revises: 040
Create Date: 2026-09-04 00:00:00.000000

Recorrência (Aegis #1250, item #599): série de tarefas materializadas
(cada ocorrência é uma linha real e independente, compartilhando um
recurrence_group_id) em vez de expansão virtual em tempo de leitura —
mais simples, e o volume é baixo (uso raro, confirmado pelo usuário).
"""
from alembic import op
import sqlalchemy as sa

revision: str = "041"
down_revision: str | None = "040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "calendar_events",
        sa.Column("recurrence_group_id", sa.String(36), nullable=True),
    )
    op.create_index(
        "ix_calendar_events_recurrence_group_id",
        "calendar_events",
        ["recurrence_group_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_calendar_events_recurrence_group_id", "calendar_events")
    op.drop_column("calendar_events", "recurrence_group_id")
