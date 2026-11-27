from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.ticket import Ticket

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

SOURCE_KIND_SYSTEM = "system"
SOURCE_KIND_ALERT = "alert"


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    api_key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sla_hours: Mapped[int | None] = mapped_column(nullable=True)
    webhook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    webhook_url_internal: Mapped[str | None] = mapped_column(String(500), nullable=True)
    webhook_secret: Mapped[str | None] = mapped_column(String(100), nullable=True)
    csat_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    csat_sampling_pct: Mapped[int] = mapped_column(default=100, nullable=False)
    # "system": a ticketing system mirrored into Aegis (e.g. a fleet management
    # instance). "alert": a monitoring tool whose tickets are incidents — SLA starts
    # at creation, and it may use the alert contract (docs/alert-ingest.md).
    kind: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SOURCE_KIND_SYSTEM, server_default=SOURCE_KIND_SYSTEM
    )
    # Alert sources only: tag auto-applied to every new ticket, and the user who gets
    # the blocking "critical source" notification (#1086) when one is created.
    alert_tag_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tags.id", ondelete="SET NULL"), nullable=True
    )
    alert_recipient_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Ingest requests per minute; NULL falls back to settings.ingest_rate_limit_per_minute.
    rate_limit_per_minute: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (CheckConstraint("kind IN ('system', 'alert')", name="ck_sources_kind"),)

    tickets: Mapped[list[Ticket]] = relationship("Ticket", back_populates="source")

    @property
    def is_alert(self) -> bool:
        return self.kind == SOURCE_KIND_ALERT
