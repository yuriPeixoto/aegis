"""create_global_settings_table

Revision ID: 015_global_settings
Revises: 014_internal_source
Create Date: 2026-03-27 11:50:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '015_global_settings'
down_revision: Union[str, None] = '014_internal_source'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'global_settings',
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('key')
    )
    
    # Insert default auto-close settings
    op.execute(
        "INSERT INTO global_settings (key, value, description) VALUES "
        "('auto_close_enabled', 'false', 'Enable or disable automatic ticket closure due to inactivity'),"
        "('auto_close_wait_days', '5', 'Number of days to wait before sending warning and closing (total)'),"
        "('auto_close_warning_days', '3', 'Number of days of inactivity before sending a warning message'),"
        "('auto_close_message', 'Olá! Notamos que este chamado está sem interação há alguns dias. Devido à inatividade, ele foi encerrado automaticamente. Caso ainda precise de ajuda, sinta-se à vontade para abrir um novo chamado.', 'Message sent to the client when the ticket is closed'),"
        "('auto_close_warning_message', 'Olá! Este chamado está sem interação há 3 dias. Caso não haja uma resposta em 2 dias, ele será encerrado automaticamente.', 'Warning message sent before closing')"
    )


def downgrade() -> None:
    op.drop_table('global_settings')
