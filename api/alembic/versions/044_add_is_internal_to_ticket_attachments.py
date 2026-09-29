"""add_is_internal_to_ticket_attachments

Revision ID: 044
Revises: 043
Create Date: 2026-09-29 00:00:00.000000

Anexo interno (Aegis #1474): mesma semântica da nota interna — visível só para a equipe.
Backfill conservador: só anexos ligados a uma nota interna viram internos; uploads
avulsos do painel (message_id NULL) e anexos ingeridos da origem permanecem públicos,
pois não há como distinguir a intenção do autor retroativamente.
"""
from alembic import op
import sqlalchemy as sa

revision: str = "044"
down_revision: str | None = "043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ticket_attachments",
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.execute("""
        UPDATE ticket_attachments ta
        SET is_internal = TRUE
        FROM ticket_messages tm
        WHERE ta.message_id = tm.id AND tm.is_internal = TRUE
    """)


def downgrade() -> None:
    op.drop_column("ticket_attachments", "is_internal")
