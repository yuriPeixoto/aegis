from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.source import Source
    from app.models.ticket_event import TicketEvent
    from app.models.user import User

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sources.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Identity in the source system (e.g. "SUP-2026-0042")
    external_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # Normalised fields — mapped from source system values
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Raw payload from source — preserved without modification
    source_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Timestamps from the source system
    source_created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    source_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Assignment — Aegis operator who owns this ticket
    assigned_to_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # SLA deadline — set at ingestion time based on source.sla_hours
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    # Aegis-managed timestamps
    first_ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    source: Mapped[Source] = relationship("Source", back_populates="tickets")
    events: Mapped[list[TicketEvent]] = relationship(
        "TicketEvent", back_populates="ticket", order_by="TicketEvent.occurred_at"
    )
    assignee: Mapped[User | None] = relationship("User", foreign_keys=[assigned_to_user_id])

    __table_args__ = (
        # Unique ticket per source — prevents duplicate ingestion
        UniqueConstraint("source_id", "external_id", name="uq_ticket_source_external"),
    )
