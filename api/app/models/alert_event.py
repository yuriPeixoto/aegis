from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AlertEvent(Base):
    """One alert event already processed — the idempotency record of the alert
    contract (docs/alert-ingest.md). The same (source, event_id) is applied once;
    a retry gets the outcome of the first delivery back."""

    __tablename__ = "alert_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False
    )
    event_id: Mapped[str] = mapped_column(String(200), nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(200), nullable=False)
    ticket_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True
    )
    # What the first delivery did: created | occurrence | resolved_noted | ignored
    result: Mapped[str] = mapped_column(String(20), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    __table_args__ = (
        UniqueConstraint("source_id", "event_id", name="uq_alert_event_source_event"),
    )
