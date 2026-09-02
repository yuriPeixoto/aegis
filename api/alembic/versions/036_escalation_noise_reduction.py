"""escalation_noise_reduction

Revision ID: 036
Revises: 035
Create Date: 2026-09-02 00:00:00.000000

Aegis #1249 — reduzir ruído da regra "Sem atualização — 48h":
1. Restringe a regra original a high/urgent (antes disparava pra qualquer prioridade).
2. Nova regra irmã pra low/medium com cooldown de 7 dias em vez de 24h.
3. Coluna escalation_rule_id em ticket_messages, usada pelo EscalationService pra
   atualizar a nota automática já existente em vez de criar uma nova a cada disparo.
"""
import sqlalchemy as sa
from alembic import op

revision: str = "036"
down_revision: str | None = "035"
branch_labels = None
depends_on = None

_NEW_RULE_NAME = "Sem atualização — 48h (baixa/média prioridade)"


def upgrade() -> None:
    op.add_column(
        "ticket_messages",
        sa.Column(
            "escalation_rule_id",
            sa.Integer(),
            sa.ForeignKey("escalation_rules.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_ticket_messages_ticket_escalation_rule",
        "ticket_messages",
        ["ticket_id", "escalation_rule_id"],
    )

    conn = op.get_bind()

    conn.execute(
        sa.text(
            """
            UPDATE escalation_rules
            SET condition_priority = '["high","urgent"]'::jsonb
            WHERE name = 'Sem atualização — 48h'
            """
        )
    )

    conn.execute(
        sa.text(
            """
            INSERT INTO escalation_rules
                (name, is_active, trigger_type, trigger_hours,
                 condition_priority, condition_status,
                 action_type, action_user_id, action_tag_id, cooldown_hours)
            VALUES
                (:name, true, 'no_update', 48,
                 '["low","medium"]'::jsonb, '["open","in_progress"]'::jsonb,
                 'notify_senior_agents', NULL, NULL, 168)
            """
        ),
        {"name": _NEW_RULE_NAME},
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM escalation_rules WHERE name = :name"),
        {"name": _NEW_RULE_NAME},
    )
    conn.execute(
        sa.text(
            """
            UPDATE escalation_rules
            SET condition_priority = '[]'::jsonb
            WHERE name = 'Sem atualização — 48h'
            """
        )
    )
    op.drop_index("ix_ticket_messages_ticket_escalation_rule", table_name="ticket_messages")
    op.drop_column("ticket_messages", "escalation_rule_id")
