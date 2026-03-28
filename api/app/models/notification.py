from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.ticket import Ticket
    from app.models.ticket_message import TicketMessage

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Recipient
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'mention'

    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    message_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("ticket_messages.id", ondelete="CASCADE"), nullable=True
    )

    # Denormalized for display — avoids joins in the notification dropdown
    actor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    ticket_subject: Mapped[str] = mapped_column(String(500), nullable=False)
    ticket_external_id: Mapped[str] = mapped_column(String(100), nullable=False)

    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    user: Mapped[User] = relationship("User", foreign_keys=[user_id])
    ticket: Mapped[Ticket] = relationship("Ticket")
    message: Mapped[TicketMessage | None] = relationship("TicketMessage")
