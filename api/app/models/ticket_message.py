from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.ticket_attachment import TicketAttachment
    from app.models.user import User

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # 'inbound'  — came from the client via source system
    # 'outbound' — sent by an agent via Aegis (public reply or internal note)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)

    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    # Internal notes are visible only to team members, never pushed to source via webhook
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # FK to the Aegis user who authored this message (set for outbound + internal notes)
    author_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # List of user IDs @mentioned in this message (used for internal notes)
    mentioned_user_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # ID of the message in the source system — used to prevent duplicate ingestion
    source_message_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    ticket: Mapped[Ticket] = relationship("Ticket", back_populates="messages")
    attachments: Mapped[list[TicketAttachment]] = relationship("TicketAttachment", back_populates="message")
    author_user: Mapped[User | None] = relationship("User", foreign_keys=[author_user_id])
