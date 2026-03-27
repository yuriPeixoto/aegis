"""insert_internal_aegis_source

Revision ID: 014_internal_source
Revises: d29a61f0d8ca
Create Date: 2026-03-27 10:55:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '014_internal_source'
down_revision: Union[str, None] = 'd29a61f0d8ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Insere a source 'Aegis' se não existir.
    # api_key_hash é obrigatório no modelo, então colocamos um valor dummy já que não será usada externamente.
    # 'internal' é o slug definido na proposta.
    op.execute(
        "INSERT INTO sources (name, slug, api_key_hash, is_active, created_at) "
        "VALUES ('Aegis Internal', 'aegis', 'internal_not_for_api_usage', true, now()) "
        "ON CONFLICT (slug) DO NOTHING"
    )


def downgrade() -> None:
    op.execute("DELETE FROM sources WHERE slug = 'aegis'")
