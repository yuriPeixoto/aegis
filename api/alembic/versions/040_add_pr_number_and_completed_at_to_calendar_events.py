"""add_pr_number_and_completed_at_to_calendar_events

Revision ID: 040
Revises: 039
Create Date: 2026-09-04 00:00:00.000000

Estrutura o PR (nullable — nem todo chamado gera PR: WhatsApp, log-watcher,
cronwatch, Aegis Internal) e a hora de conclusão da tarefa vinculada a um
chamado. Aegis #1250 — redesenho pedido pelo usuário durante o #598: o
fechamento do chamado passa a atualizar a tarefa já existente na Agenda
(ou criar uma já concluída, se nenhuma foi agendada) em vez de criar um
evento type="deployment" separado.
"""
from alembic import op
import sqlalchemy as sa

revision: str = "040"
down_revision: str | None = "039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "calendar_events",
        sa.Column("pr_number", sa.String(200), nullable=True),
    )
    op.add_column(
        "calendar_events",
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("calendar_events", "completed_at")
    op.drop_column("calendar_events", "pr_number")
