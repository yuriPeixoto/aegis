from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.ticket import Ticket

from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# Association table for Ticket and Tag (Many-to-Many)
ticket_tags = Table(
    "ticket_tags",
    Base.metadata,
    Column("ticket_id", Integer, ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#6B7280")  # Default gray-500
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    tickets: Mapped[list[Ticket]] = relationship(
        "Ticket", secondary=ticket_tags, back_populates="tags"
    )
