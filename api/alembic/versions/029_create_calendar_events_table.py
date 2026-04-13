"""create_calendar_events_table

Revision ID: 029
Revises: 028
Create Date: 2026-04-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision: str = "029"
down_revision: str | None = "028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "type",
            sa.String(20),
            nullable=False,
            comment="on_call | training",
        ),
        sa.Column(
            "agent_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=True),
        sa.Column("end_time", sa.String(5), nullable=True),
        sa.Column(
            "source_id",
            sa.Integer(),
            sa.ForeignKey("sources.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_calendar_events_agent_id", "calendar_events", ["agent_id"])
    op.create_index("ix_calendar_events_event_date", "calendar_events", ["event_date"])
    op.create_index("ix_calendar_events_type", "calendar_events", ["type"])
    # Garante unicidade de on_call por data — apenas um agent de plantão por dia
    # (índice parcial único, não suportado via create_unique_constraint)
    op.create_index(
        "uq_on_call_per_date",
        "calendar_events",
        ["event_date"],
        unique=True,
        postgresql_where=sa.text("type = 'on_call'"),
    )


def downgrade() -> None:
    op.drop_index("uq_on_call_per_date", "calendar_events")
    op.drop_index("ix_calendar_events_type", "calendar_events")
    op.drop_index("ix_calendar_events_event_date", "calendar_events")
    op.drop_index("ix_calendar_events_agent_id", "calendar_events")
    op.drop_table("calendar_events")
