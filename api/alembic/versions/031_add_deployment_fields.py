"""add_deployment_fields

Revision ID: 031
Revises: 030
Create Date: 2026-05-10 00:00:00.000000

Adiciona deployment_scheduled_at e pr_number em tickets.
Adiciona ticket_id em calendar_events para eventos de deploy.
"""
from alembic import op
import sqlalchemy as sa

revision: str = "031"
down_revision: str | None = "030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tickets",
        sa.Column("deployment_scheduled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "tickets",
        sa.Column("pr_number", sa.String(200), nullable=True),
    )
    op.add_column(
        "calendar_events",
        sa.Column(
            "ticket_id",
            sa.Integer(),
            sa.ForeignKey("tickets.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("calendar_events", "ticket_id")
    op.drop_column("tickets", "pr_number")
    op.drop_column("tickets", "deployment_scheduled_at")
