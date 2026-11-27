"""alert_sources_and_alert_contract

Revision ID: 045
Revises: 044
Create Date: 2026-11-27 00:00:00.000000

Alert ingest contract (docs/alert-ingest.md, ADR-013):

- sources.kind (system | alert), with the alert tag and the recipient of the
  "critical source" notification configurable per source, replacing the
  hardcoded _CRITICAL_SOURCE_ALERTS map and AEGIS_CRITICAL_ALERT_EMAIL;
- sources.rate_limit_per_minute (NULL = the application default);
- tickets.alert_fingerprint / occurrence_count / last_occurrence_at /
  previous_ticket_id, plus a partial unique index: one open ticket per problem;
- alert_events: idempotency by (source_id, event_id);
- source_rate_windows: fixed one-minute request counters per source.

Transition: the source with slug "log-watcher" (the only entry of the old map)
becomes kind=alert with the "Log Watcher" tag. The recipient is a user of the
installation, so it is not set here: configure it in Settings → Sources (or by
SQL) after the deploy. Without it the tag is still applied, as before when the
recipient was missing.
"""

from alembic import op
import sqlalchemy as sa

revision: str = "045"
down_revision: str | None = "044"
branch_labels = None
depends_on = None

_LOG_WATCHER_SLUG = "log-watcher"
_LOG_WATCHER_TAG = "Log Watcher"


def upgrade() -> None:
    op.add_column(
        "sources",
        sa.Column("kind", sa.String(20), nullable=False, server_default="system"),
    )
    op.create_check_constraint("ck_sources_kind", "sources", "kind IN ('system', 'alert')")
    op.add_column(
        "sources",
        sa.Column(
            "alert_tag_id",
            sa.Integer(),
            sa.ForeignKey("tags.id", ondelete="SET NULL", name="fk_sources_alert_tag_id"),
            nullable=True,
        ),
    )
    op.add_column(
        "sources",
        sa.Column(
            "alert_recipient_user_id",
            sa.Integer(),
            sa.ForeignKey(
                "users.id", ondelete="SET NULL", name="fk_sources_alert_recipient_user_id"
            ),
            nullable=True,
        ),
    )
    op.add_column("sources", sa.Column("rate_limit_per_minute", sa.Integer(), nullable=True))

    op.add_column("tickets", sa.Column("alert_fingerprint", sa.String(200), nullable=True))
    op.add_column(
        "tickets",
        sa.Column("occurrence_count", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "tickets", sa.Column("last_occurrence_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "tickets",
        sa.Column(
            "previous_ticket_id",
            sa.Integer(),
            sa.ForeignKey("tickets.id", ondelete="SET NULL", name="fk_tickets_previous_ticket_id"),
            nullable=True,
        ),
    )
    op.create_index(
        "uq_ticket_open_alert_fingerprint",
        "tickets",
        ["source_id", "alert_fingerprint"],
        unique=True,
        postgresql_where=sa.text(
            "alert_fingerprint IS NOT NULL "
            "AND status NOT IN ('resolved', 'closed', 'cancelled', 'merged')"
        ),
    )

    op.create_table(
        "alert_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "source_id",
            sa.Integer(),
            sa.ForeignKey("sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_id", sa.String(200), nullable=False),
        sa.Column("fingerprint", sa.String(200), nullable=False),
        sa.Column(
            "ticket_id",
            sa.Integer(),
            sa.ForeignKey("tickets.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("result", sa.String(20), nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("source_id", "event_id", name="uq_alert_event_source_event"),
    )
    op.create_index("ix_alert_events_received_at", "alert_events", ["received_at"])

    op.create_table(
        "source_rate_windows",
        sa.Column(
            "source_id",
            sa.Integer(),
            sa.ForeignKey("sources.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("window_start", sa.DateTime(timezone=True), primary_key=True),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="0"),
    )

    # Carry the old hardcoded map over: log-watcher becomes an alert source
    # with its tag (created here if it never existed).
    op.execute(
        sa.text(
            "INSERT INTO tags (name, color) "
            "SELECT :tag, '#6B7280' "
            "WHERE EXISTS (SELECT 1 FROM sources WHERE slug = :slug) "
            "ON CONFLICT (name) DO NOTHING"
        ).bindparams(tag=_LOG_WATCHER_TAG, slug=_LOG_WATCHER_SLUG)
    )
    op.execute(
        sa.text(
            "UPDATE sources SET kind = 'alert', "
            "alert_tag_id = (SELECT id FROM tags WHERE name = :tag) "
            "WHERE slug = :slug"
        ).bindparams(tag=_LOG_WATCHER_TAG, slug=_LOG_WATCHER_SLUG)
    )


def downgrade() -> None:
    op.drop_table("source_rate_windows")
    op.drop_index("ix_alert_events_received_at", table_name="alert_events")
    op.drop_table("alert_events")

    op.drop_index("uq_ticket_open_alert_fingerprint", table_name="tickets")
    op.drop_constraint("fk_tickets_previous_ticket_id", "tickets", type_="foreignkey")
    op.drop_column("tickets", "previous_ticket_id")
    op.drop_column("tickets", "last_occurrence_at")
    op.drop_column("tickets", "occurrence_count")
    op.drop_column("tickets", "alert_fingerprint")

    op.drop_column("sources", "rate_limit_per_minute")
    op.drop_constraint("fk_sources_alert_recipient_user_id", "sources", type_="foreignkey")
    op.drop_column("sources", "alert_recipient_user_id")
    op.drop_constraint("fk_sources_alert_tag_id", "sources", type_="foreignkey")
    op.drop_column("sources", "alert_tag_id")
    op.drop_constraint("ck_sources_kind", "sources", type_="check")
    op.drop_column("sources", "kind")
