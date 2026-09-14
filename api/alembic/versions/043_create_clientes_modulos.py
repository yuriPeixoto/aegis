"""create_clientes_modulos

Revision ID: 043
Revises: 042
Create Date: 2026-09-14 00:00:00.000000

Índice local de Cliente e catálogo de Módulo/Serviço — ver ADR-012. Cliente é
tabela nova, separada de Source (FK opcional), não herança/discriminator.
Modulo é CRUD admin, não enum. Ticket.cliente_id/modulo_id ficam fora desta
migration (fora do MVP, ver ADR).
"""
from alembic import op
import sqlalchemy as sa

revision: str = "043"
down_revision: str | None = "042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "clientes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "source_id",
            sa.Integer(),
            sa.ForeignKey("sources.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "modulos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "cliente_modulos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "cliente_id",
            sa.Integer(),
            sa.ForeignKey("clientes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "modulo_id",
            sa.Integer(),
            sa.ForeignKey("modulos.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "ativado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("cliente_id", "modulo_id", name="uq_cliente_modulo"),
    )

    # Seed do catálogo original do ticket #1307 — admin pode editar/adicionar depois.
    modulos_table = sa.table(
        "modulos",
        sa.column("nome", sa.String),
        sa.column("ativo", sa.Boolean),
    )
    op.bulk_insert(
        modulos_table,
        [
            {"nome": "Painel de Abastecimentos", "ativo": True},
            {"nome": "Painel de Manutenções", "ativo": True},
            {"nome": "Jornada", "ativo": True},
            {"nome": "Gestão de Frotas", "ativo": True},
            {"nome": "Telemetria", "ativo": True},
            {"nome": "Checklist Suite", "ativo": True},
        ],
    )


def downgrade() -> None:
    op.drop_table("cliente_modulos")
    op.drop_table("modulos")
    op.drop_table("clientes")
