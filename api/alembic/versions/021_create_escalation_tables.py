"""create_escalation_tables

Revision ID: 021
Revises: 020
Create Date: 2026-03-27 20:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "021"
down_revision = "020_add_is_senior"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "escalation_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        # Trigger: what condition activates this rule
        # sla_at_risk | sla_breach | no_update | unassigned_time
        sa.Column("trigger_type", sa.String(50), nullable=False),
        # Hours threshold for the trigger
        sa.Column("trigger_hours", sa.Float(), nullable=False),
        # Conditions (empty array = match all)
        sa.Column("condition_priority", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("condition_status", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'")),
        # Action to take
        # reassign_to_user | notify_admins | increase_priority | add_tag | notify_senior_agents
        sa.Column("action_type", sa.String(50), nullable=False),
        sa.Column("action_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action_tag_id", sa.Integer(), sa.ForeignKey("tags.id", ondelete="SET NULL"), nullable=True),
        # How many hours before this rule can fire again for the same ticket
        sa.Column("cooldown_hours", sa.Float(), nullable=False, server_default="24"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "ticket_escalations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_id", sa.Integer(), sa.ForeignKey("escalation_rules.id", ondelete="SET NULL"), nullable=True),
        # Snapshot of rule name at time of escalation (rule may be renamed/deleted later)
        sa.Column("rule_name", sa.String(255), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_ticket_escalations_ticket_id", "ticket_escalations", ["ticket_id"])
    op.create_index("ix_ticket_escalations_rule_ticket", "ticket_escalations", ["rule_id", "ticket_id"])


def downgrade() -> None:
    op.drop_index("ix_ticket_escalations_rule_ticket", "ticket_escalations")
    op.drop_index("ix_ticket_escalations_ticket_id", "ticket_escalations")
    op.drop_table("ticket_escalations")
    op.drop_table("escalation_rules")
