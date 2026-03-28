"""internal_notes_in_messages

Merge ticket_notes into ticket_messages with is_internal flag.

Revision ID: 017
Revises: 016_create_canned_responses
Create Date: 2026-03-27 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '017_internal_notes'
down_revision = '016_create_canned_responses'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to ticket_messages
    op.add_column(
        'ticket_messages',
        sa.Column('is_internal', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.add_column(
        'ticket_messages',
        sa.Column(
            'author_user_id',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column(
        'ticket_messages',
        sa.Column(
            'mentioned_user_ids',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default='[]',
        ),
    )

    # Migrate existing notes as internal messages
    op.execute("""
        INSERT INTO ticket_messages
            (ticket_id, direction, author_name, body, is_internal, author_user_id,
             mentioned_user_ids, created_at)
        SELECT
            tn.ticket_id,
            'outbound',
            COALESCE(u.name, 'Usuário desconhecido'),
            tn.body,
            TRUE,
            tn.author_id,
            '[]'::jsonb,
            tn.created_at
        FROM ticket_notes tn
        LEFT JOIN users u ON u.id = tn.author_id
        ORDER BY tn.created_at
    """)

    # Drop the now-redundant notes table
    op.drop_table('ticket_notes')


def downgrade() -> None:
    # Recreate notes table
    op.create_table(
        'ticket_notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), sa.ForeignKey('tickets.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('author_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'),
                  nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # Restore notes from internal messages
    op.execute("""
        INSERT INTO ticket_notes (ticket_id, author_id, body, created_at)
        SELECT ticket_id, author_user_id, body, created_at
        FROM ticket_messages
        WHERE is_internal = TRUE
    """)

    # Remove internal messages that were migrated from notes
    op.execute("DELETE FROM ticket_messages WHERE is_internal = TRUE")

    op.drop_column('ticket_messages', 'mentioned_user_ids')
    op.drop_column('ticket_messages', 'author_user_id')
    op.drop_column('ticket_messages', 'is_internal')
