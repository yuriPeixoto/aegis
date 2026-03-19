"""add role to users

Revision ID: 005
Revises: 004
Create Date: 2026-03-18

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(50),
            nullable=False,
            server_default="agent",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
