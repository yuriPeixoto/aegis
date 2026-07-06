"""create_ticket_checklist_items

Revision ID: 032
Revises: 031
Create Date: 2026-07-06 00:00:00.000000

Checklist de subitens por chamado (padrão ClickUp/GitHub Issues — checkbox leve,
sem workflow próprio). O progresso do ticket é sempre derivado (done/total),
nunca setado manualmente. Ver ADR-009.
"""
from alembic import op
import sqlalchemy as sa

revision: str = "032"
down_revision: str | None = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ticket_checklist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "ticket_id",
            sa.Integer(),
            sa.ForeignKey("tickets.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("is_done", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "created_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "done_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("done_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("ticket_checklist_items")
