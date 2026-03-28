"""create_notifications

Revision ID: 018
Revises: 926bd33b5ecc
Create Date: 2026-03-27 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '018_create_notifications'
down_revision = '926bd33b5ecc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('type', sa.String(50), nullable=False),  # 'mention'
        sa.Column('ticket_id', sa.Integer(), sa.ForeignKey('tickets.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('message_id', sa.Integer(), sa.ForeignKey('ticket_messages.id', ondelete='CASCADE'),
                  nullable=True),
        sa.Column('actor_name', sa.String(255), nullable=False),  # who triggered the notification
        sa.Column('ticket_subject', sa.String(500), nullable=False),  # denormalized for display
        sa.Column('ticket_external_id', sa.String(100), nullable=False),  # denormalized for display
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False, index=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_user_unread', 'notifications',
                    ['user_id', 'read_at'])


def downgrade() -> None:
    op.drop_index('ix_notifications_user_unread', table_name='notifications')
    op.drop_table('notifications')
