"""create_training_records

Revision ID: 035
Revises: 034
Create Date: 2026-09-01 00:00:00.000000

Registro de treinamento com assinatura de participantes — ticket #985.
Ver docs/adr/011-training-attendance-records.md.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "035"
down_revision: str | None = "034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "training_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "calendar_event_id",
            sa.Integer(),
            sa.ForeignKey("calendar_events.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "source_id",
            sa.Integer(),
            sa.ForeignKey("sources.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("training_name", sa.String(255), nullable=False),
        sa.Column("system_module", sa.String(255), nullable=False),
        sa.Column("version", sa.String(50), nullable=True),
        sa.Column("training_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=True),
        sa.Column("end_time", sa.String(5), nullable=True),
        sa.Column("workload_hours", sa.String(20), nullable=True),
        sa.Column("modality", sa.String(20), nullable=False),
        sa.Column("training_type", sa.String(30), nullable=False),
        sa.Column("area_sector", sa.String(255), nullable=True),
        sa.Column(
            "instructor_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("instructor_title", sa.String(255), nullable=True),
        sa.Column(
            "modules_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("evaluation_method", sa.String(255), nullable=True),
        sa.Column("performance_notes", sa.Text(), nullable=True),
        sa.Column("general_notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("instructor_signature_path", sa.String(500), nullable=True),
        sa.Column("instructor_signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("responsible_name", sa.String(255), nullable=True),
        sa.Column("responsible_signature_path", sa.String(500), nullable=True),
        sa.Column("responsible_signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "training_participants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "training_record_id",
            sa.Integer(),
            sa.ForeignKey("training_records.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role_title", sa.String(255), nullable=True),
        sa.Column("sector", sa.String(255), nullable=True),
        sa.Column("signature_path", sa.String(500), nullable=True),
        sa.Column(
            "confirmed_understanding", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signed_ip", sa.String(45), nullable=True),
        sa.Column("signing_token", sa.String(64), nullable=False, unique=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_training_participants_training_record_id",
        "training_participants",
        ["training_record_id"],
    )
    op.create_index(
        "ix_training_participants_signing_token", "training_participants", ["signing_token"]
    )


def downgrade() -> None:
    op.drop_index("ix_training_participants_signing_token", table_name="training_participants")
    op.drop_index(
        "ix_training_participants_training_record_id", table_name="training_participants"
    )
    op.drop_table("training_participants")
    op.drop_table("training_records")
