from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.training_record import TrainingRecord


class TrainingParticipant(Base):
    __tablename__ = "training_participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    training_record_id: Mapped[int] = mapped_column(
        ForeignKey("training_records.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(255), nullable=True)

    signature_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    confirmed_understanding: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)

    signing_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    training_record: Mapped[TrainingRecord] = relationship(
        "TrainingRecord", back_populates="participants"
    )

    @property
    def has_signature(self) -> bool:
        return self.signature_path is not None
