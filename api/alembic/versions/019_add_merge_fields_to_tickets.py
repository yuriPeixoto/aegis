"""add_merge_fields_to_tickets

Revision ID: 019
Revises: 018_create_notifications
Create Date: 2026-03-27 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '019_add_merge_fields'
down_revision = '018_create_notifications'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'tickets',
        sa.Column(
            'merged_into_ticket_id',
            sa.Integer(),
            sa.ForeignKey('tickets.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'tickets',
        sa.Column('merged_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('tickets', 'merged_at')
    op.drop_column('tickets', 'merged_into_ticket_id')
