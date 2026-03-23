"""SLA business hours — config table, policies table, ticket SLA columns

Revision ID: 013
Revises: 012
Create Date: 2026-03-23
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── business_hours_config ────────────────────────────────────────────────
    op.create_table(
        "business_hours_config",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("work_days", ARRAY(sa.Integer), nullable=False),
        sa.Column("work_start", sa.Time, nullable=False),
        sa.Column("work_end", sa.Time, nullable=False),
        sa.Column("lunch_start", sa.Time, nullable=True),
        sa.Column("lunch_end", sa.Time, nullable=True),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="UTC"),
    )

    # Seed default: Mon–Fri 08:00–17:40, lunch 11:30–12:30, São Paulo
    op.execute("""
        INSERT INTO business_hours_config
            (id, work_days, work_start, work_end, lunch_start, lunch_end, timezone)
        VALUES
            (1, '{1,2,3,4,5}', '08:00', '17:40', '11:30', '12:30', 'America/Cuiaba')
    """)

    # ── sla_policies ─────────────────────────────────────────────────────────
    op.create_table(
        "sla_policies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("priority", sa.String(50), nullable=False, unique=True),
        sa.Column("resolution_hours", sa.Integer, nullable=False),
    )

    # Seed default policies (business hours):
    #   urgent  →  6 h  (< 1 business day)
    #   high    → 24 h  (~3 business days)
    #   medium  → 40 h  (~5 business days)
    #   low     → 56 h  (~7 business days)
    op.execute("""
        INSERT INTO sla_policies (priority, resolution_hours) VALUES
            ('urgent',  6),
            ('high',   24),
            ('medium', 40),
            ('low',    56)
    """)

    # ── tickets — new SLA tracking columns ───────────────────────────────────
    op.add_column("tickets", sa.Column("sla_started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tickets", sa.Column("sla_paused_seconds", sa.Integer, nullable=False, server_default="0"))
    op.add_column("tickets", sa.Column("sla_paused_since", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("tickets", "sla_paused_since")
    op.drop_column("tickets", "sla_paused_seconds")
    op.drop_column("tickets", "sla_started_at")
    op.drop_table("sla_policies")
    op.drop_table("business_hours_config")
