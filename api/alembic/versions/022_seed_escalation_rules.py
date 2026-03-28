"""seed_escalation_rules

Revision ID: 022
Revises: 021
Create Date: 2026-03-28 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


RULES = [
    (
        "SLA violado — alta/urgente",
        True, "sla_breach", 0.5,
        '["high","urgent"]', '[]',
        "notify_admins", "NULL", "NULL", 4,
    ),
    (
        "SLA em risco — urgente (2h)",
        True, "sla_at_risk", 2,
        '["urgent"]', '[]',
        "notify_senior_agents", "NULL", "NULL", 2,
    ),
    (
        "Sem responsável — urgente/alta (2h)",
        True, "unassigned_time", 2,
        '["urgent","high"]', '[]',
        "notify_admins", "NULL", "NULL", 6,
    ),
    (
        "Sem atualização — 48h",
        True, "no_update", 48,
        '[]', '["open","in_progress","waiting_client"]',
        "notify_senior_agents", "NULL", "NULL", 24,
    ),
]

RULE_NAMES = [r[0] for r in RULES]


def upgrade() -> None:
    conn = op.get_bind()
    for (name, is_active, trigger_type, trigger_hours,
         cond_priority, cond_status,
         action_type, action_user_id, action_tag_id, cooldown_hours) in RULES:
        sql = f"""
            INSERT INTO escalation_rules
                (name, is_active, trigger_type, trigger_hours,
                 condition_priority, condition_status,
                 action_type, action_user_id, action_tag_id, cooldown_hours)
            VALUES
                ('{name}', {str(is_active).lower()}, '{trigger_type}', {trigger_hours},
                 '{cond_priority}'::jsonb, '{cond_status}'::jsonb,
                 '{action_type}', {action_user_id}, {action_tag_id}, {cooldown_hours})
        """
        conn.execute(sa.text(sql))


def downgrade() -> None:
    for name in RULE_NAMES:
        conn = op.get_bind()
        conn.execute(
            sa.text("DELETE FROM escalation_rules WHERE name = :name"),
            {"name": name},
        )
