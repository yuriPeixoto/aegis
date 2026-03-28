"""seed_saved_views

Revision ID: 024
Revises: 023
Create Date: 2026-03-28 11:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None

# Shared default views — user_id NULL, is_shared true
VIEWS = [
    (
        "Meus tickets", "🙋",
        '{"active_only": true, "assigned_to": "me"}',
        True, 0,
    ),
    (
        "Urgentes", "🔥",
        '{"active_only": true, "priority": "urgent"}',
        True, 1,
    ),
    (
        "Sem responsável", "👤",
        '{"active_only": true, "assigned_to": "unassigned"}',
        True, 2,
    ),
]

VIEW_NAMES = [v[0] for v in VIEWS]


def upgrade() -> None:
    conn = op.get_bind()
    for (name, icon, filters_json, is_shared, position) in VIEWS:
        sql = f"""
            INSERT INTO saved_views (name, icon, user_id, is_shared, filters, position)
            VALUES ('{name}', '{icon}', NULL, {str(is_shared).lower()}, '{filters_json}'::jsonb, {position})
        """
        conn.execute(sa.text(sql))


def downgrade() -> None:
    conn = op.get_bind()
    for name in VIEW_NAMES:
        conn.execute(
            sa.text("DELETE FROM saved_views WHERE name = :name AND user_id IS NULL"),
            {"name": name},
        )
