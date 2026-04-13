"""notification_calendar_support

Revision ID: 030
Revises: 029
Create Date: 2026-04-11 00:00:00.000000

Torna ticket_id nullable na tabela notifications e adiciona
suporte a lembretes de calendário (on_call_reminder / training_reminder).
"""
from alembic import op
import sqlalchemy as sa

revision: str = "030"
down_revision: str | None = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ticket_id, ticket_subject e ticket_external_id passam a ser opcionais
    # (notificações de calendário não têm ticket associado)
    op.alter_column("notifications", "ticket_id", nullable=True)
    op.alter_column("notifications", "ticket_subject", nullable=True)
    op.alter_column("notifications", "ticket_external_id", nullable=True)

    # FK para o evento de calendário que originou o lembrete
    op.add_column(
        "notifications",
        sa.Column(
            "calendar_event_id",
            sa.Integer(),
            sa.ForeignKey("calendar_events.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )

    # Data do evento (denormalizada para evitar join no dropdown do sino)
    op.add_column(
        "notifications",
        sa.Column("event_date", sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notifications", "event_date")
    op.drop_column("notifications", "calendar_event_id")
    op.alter_column("notifications", "ticket_external_id", nullable=False)
    op.alter_column("notifications", "ticket_subject", nullable=False)
    op.alter_column("notifications", "ticket_id", nullable=False)
