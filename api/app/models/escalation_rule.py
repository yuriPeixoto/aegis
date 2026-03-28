from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Trigger
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    trigger_hours: Mapped[float] = mapped_column(Float, nullable=False)

    # Conditions (empty list = match all)
    condition_priority: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    condition_status: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Action
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    action_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action_tag_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tags.id", ondelete="SET NULL"), nullable=True
    )
    cooldown_hours: Mapped[float] = mapped_column(Float, nullable=False, default=24.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    action_user: Mapped[object] = relationship("User", foreign_keys=[action_user_id], lazy="selectin")


class TicketEscalation(Base):
    __tablename__ = "ticket_escalations"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    rule_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("escalation_rules.id", ondelete="SET NULL"), nullable=True
    )
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
