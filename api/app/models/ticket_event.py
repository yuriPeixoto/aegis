from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.ticket import Ticket

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TicketEvent(Base):
    __tablename__ = "ticket_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # e.g. "created", "status_changed", "response_added", "assigned"
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # Full raw payload as received from the source system
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # When the event occurred in the source system (may differ from ingestion time)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    ticket: Mapped[Ticket] = relationship("Ticket", back_populates="events")
