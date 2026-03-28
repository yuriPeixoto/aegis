"""merge_tags_and_internal_notes

Revision ID: 926bd33b5ecc
Revises: 017_internal_notes, 0b8b0dc14233
Create Date: 2026-03-27 20:31:37.068353

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '926bd33b5ecc'
down_revision: Union[str, None] = ('017_internal_notes', '0b8b0dc14233')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
