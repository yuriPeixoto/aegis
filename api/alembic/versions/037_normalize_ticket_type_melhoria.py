"""normalize_ticket_type_melhoria

Revision ID: 037
Revises: 036
Create Date: 2026-09-02 00:00:00.000000

Aegis #1252, achado 2: 1 registro isolado com type='melhoria' (português),
inconsistente com o padrão em inglês ('improvement') usado pelo resto da base.
"""
import sqlalchemy as sa
from alembic import op

revision: str = "037"
down_revision: str | None = "036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("UPDATE tickets SET type = 'improvement' WHERE type = 'melhoria'"))


def downgrade() -> None:
    # Não reversível com segurança — não há como distinguir depois do fato quais
    # linhas 'improvement' eram originalmente 'melhoria'. Downgrade é no-op.
    pass
